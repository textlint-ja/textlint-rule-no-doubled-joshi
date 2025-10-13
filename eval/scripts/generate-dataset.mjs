import { getRuleTest } from "create-textlint-rule-example";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// プロジェクトルートを取得
const projectRoot = path.resolve(__dirname, "../..");

// テストファイルからケースを抽出
const filePath = path.join(projectRoot, "test/no-doubled-joshi-test.ts");
const content = await fs.readFile(filePath, "utf-8");

const results = getRuleTest({
    content: content,
    filePath: filePath
});

console.log(`抽出されたテストケース: valid=${results.valid.length}, invalid=${results.invalid.length}`);

// invalidケースのみを対象にする（エラーメッセージの評価）
const dataset = results.invalid.map((testCase, index) => {
    // エラーメッセージを取得
    const errorMessage = testCase.errors[0]?.message || "";

    // 重複している助詞を抽出（メッセージから）
    const particleMatch = errorMessage.match(/助詞 "([^"]+)" が/);
    const particle = particleMatch ? particleMatch[1] : "";

    return {
        text: testCase.text,
        particle: particle,
        errorMessage: errorMessage,
        options: testCase.options || {},
        caseId: `invalid-${index + 1}`
    };
});

// promptfoo用にvars形式に変換
const datasetWithVars = dataset.map(testCase => ({
    vars: testCase
}));

// 小規模テスト用に最初の5ケースを抽出
const smallDataset = dataset.slice(0, 5);
const smallDatasetWithVars = smallDataset.map(testCase => ({
    vars: testCase
}));

// データセットを保存
const outputDir = path.join(__dirname, "../tests");
await fs.writeFile(
    path.join(outputDir, "doubled_joshi_cases.json"),
    JSON.stringify(datasetWithVars, null, 2)
);

await fs.writeFile(
    path.join(outputDir, "doubled_joshi_cases_small.json"),
    JSON.stringify(smallDatasetWithVars, null, 2)
);

console.log(`\nデータセット生成完了:`);
console.log(`- 全ケース: ${dataset.length}件 → eval/tests/doubled_joshi_cases.json`);
console.log(`- 小規模テスト: ${smallDataset.length}件 → eval/tests/doubled_joshi_cases_small.json`);

// サンプルを表示
console.log("\n最初のケース:");
console.log(JSON.stringify(smallDataset[0], null, 2));
