import { TextlintKernel } from "@textlint/kernel";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// プロジェクトルート
const projectRoot = path.resolve(__dirname, "../..");

/**
 * promptfooカスタムプロバイダー: textlintを実行してエラーメッセージを取得
 */
export default class TextlintProvider {
    constructor(options = {}) {
        this.id = () => "textlint-no-doubled-joshi";
    }

    /**
     * promptfooから呼び出されるメイン関数
     * @param {string} prompt - 使用しない（評価プロンプトはClaude側で処理）
     * @param {object} context - promptfooのコンテキスト
     * @param {object} context.vars - テストケースの変数
     * @returns {Promise<object>} - textlintの実行結果
     */
    async callApi(prompt, context) {
        const { vars } = context;
        // promptに展開されたテキスト、またはvars.textを使用
        const text = prompt || vars.text || "";
        const options = vars.options || {};

        // テキストが空の場合はエラーを返す
        if (!text) {
            return {
                output: "エラー: テキストが指定されていません (prompt:" + prompt + ", vars:" + JSON.stringify(vars) + ")",
                error: "No text provided"
            };
        }

        try {
            // ルールをインポート（CommonJS）
            const { createRequire } = await import("module");
            const require = createRequire(import.meta.url);
            const ruleModule = require(path.join(projectRoot, "lib/no-doubled-joshi.js"));
            const rule = ruleModule.default || ruleModule;

            // kernelを作成
            const kernel = new TextlintKernel();

            // テキストプラグインをインポート
            const textPluginModule = require("@textlint/textlint-plugin-text");
            const textPlugin = textPluginModule.default || textPluginModule;

            // ルールを設定して実行
            const results = await kernel.lintText(text, {
                filePath: "test.txt",
                ext: ".txt",
                plugins: [
                    {
                        pluginId: "text",
                        plugin: textPlugin
                    }
                ],
                rules: [
                    {
                        ruleId: "no-doubled-joshi",
                        rule: rule,
                        options: options
                    }
                ]
            });

            // エラーメッセージを抽出
            const messages = results.messages || [];
            const errorMessage = messages.length > 0 ? messages[0].message : "エラーなし";

            // エラーがある場合は、LLMで修正文を生成
            let fixedText = "";
            if (messages.length > 0) {
                try {
                    const fixResponse = await fetch("http://localhost:11434/api/generate", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            model: "qwen2.5",
                            prompt: `以下のテキストに問題があります。エラーメッセージを参考に、自然で読みやすい日本語に修正してください。修正後のテキストのみを出力してください。

元のテキスト：
${text}

エラーメッセージ：
${errorMessage}

修正後のテキスト：`,
                            stream: false,
                        }),
                    });

                    if (fixResponse.ok) {
                        const fixData = await fixResponse.json();
                        fixedText = fixData.response.trim();
                    }
                } catch (err) {
                    console.error("修正文生成エラー:", err);
                }
            }

            // エラーメッセージと修正文を組み合わせて出力
            const output = fixedText
                ? `${errorMessage}\n\n---\n\n【修正案】\n${fixedText}`
                : errorMessage;

            return {
                output: output,
                context: {
                    fixedText: fixedText,
                    originalText: text
                },
                tokenUsage: {
                    total: 0,
                    prompt: 0,
                    completion: 0
                }
            };
        } catch (error) {
            return {
                output: `実行エラー: ${error.message}`,
                error: error.message
            };
        }
    }
}
