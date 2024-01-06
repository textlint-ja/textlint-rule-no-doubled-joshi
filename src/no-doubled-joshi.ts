// LICENSE : MIT
"use strict";
import { RuleHelper } from "textlint-rule-helper";
import {
    SentenceSplitterSyntax,
    SentenceSplitterTxtNode,
    splitAST as splitSentences,
    TxtSentenceNode
} from "sentence-splitter";
import { KuromojiToken, tokenize } from "kuromojin";
import {
    concatJoishiTokens,
    createKeyFromKey,
    create読点Matcher,
    is助詞Token,
    is括弧Token,
    restoreToSurfaceFromKey
} from "./token-utils";
import type { AnyTxtNode } from "@textlint/ast-node-types";
import type { TextlintRuleModule } from "@textlint/types";
import { StringSource } from "textlint-util-to-string";
import type { StringSourceTxtParentNodeLikeNode } from "textlint-util-to-string/src/StringSource";

/**
 * Create token map object
 * {
 *  "は:助詞.係助詞": [token, token]
 * }
 * @param tokens
 * @returns {*}
 */
function createSurfaceKeyMap(tokens: KuromojiToken[]): { [index: string]: KuromojiToken[] } {
    // 助詞のみを対象とする
    return tokens.filter(is助詞Token).reduce(
        (keyMap, token) => {
            // "は:助詞.係助詞" : [token]
            const tokenKey = createKeyFromKey(token);
            if (!keyMap[tokenKey]) {
                keyMap[tokenKey] = [];
            }
            keyMap[tokenKey].push(token);
            return keyMap;
        },
        {} as { [index: string]: KuromojiToken[] }
    );
}

function matchExceptionRule(joshiTokens: KuromojiToken[], allTokens: KuromojiToken[]) {
    const token = joshiTokens[0];
    // "の" の重なりは例外
    if (token.pos_detail_1 === "連体化") {
        return true;
    }
    // "を" の重なりは例外
    if (token.pos_detail_1 === "格助詞" && token.surface_form === "を") {
        return true;
    }
    // 接続助詞 "て" の重なりは例外
    if (token.pos_detail_1 === "接続助詞" && token.surface_form === "て") {
        return true;
    }
    // 並立助詞は例外
    // 登ったり降りたり
    if (
        joshiTokens.length === 2 &&
        joshiTokens[0].pos_detail_1 === "並立助詞" &&
        joshiTokens[1].pos_detail_1 === "並立助詞"
    ) {
        return true;
    }
    // 〜か〜か のパターン
    // 〜かどうか は例外 として許容する
    if (joshiTokens.length === 2 && joshiTokens[0].surface_form === "か" && joshiTokens[1].surface_form === "か") {
        // 〜|か|どう|か|
        const lastかIndex = allTokens.indexOf(joshiTokens[1]);
        const douToken = allTokens[lastかIndex - 1];
        if (douToken && douToken.surface_form === "どう") {
            return true;
        }
    }
    return false;
}

/*
 default options
 */
const defaultOptions = {
    min_interval: 1,
    strict: false,
    allow: [],
    separatorCharacters: [
        ".", // period
        "．", // (ja) zenkaku-period
        "。", // (ja) 句点
        "?", // question mark
        "!", //  exclamation mark
        "？", // (ja) zenkaku question mark
        "！" // (ja) zenkaku exclamation mark
    ],
    commaCharacters: [
        "、",
        "，" // 全角カンマ
    ]
};

export interface Options {
    /**
     * 助詞の最低間隔値
     * 指定した間隔値以下で同じ助詞が出現した場合エラーが出力されます
     * デフォルトは1なので、同じ助詞が連続した場合にエラーとなります。
     */
    min_interval?: number;
    /**
     * デフォルトの例外パターンもエラーにするかどうか
     * デフォルト: false
     */
    strict?: boolean;
    /**
     * 複数回の出現を許す助詞の配列
     * 例): ["も", "や"]
     */
    allow?: string[];
    /**
     * 文の区切りとなる文字(句点)の配列
     */
    separatorCharacters?: string[];
    /**
     * 読点となる文字の配列
     */
    commaCharacters?: string[];
}

/**
 * "~~~~~~{助詞}" から {Token}"{助詞}" という形になるように、前の単語を含めた助詞の文字列を取得する
 *
 * 前のNodeがStrの場合は、一つ前のTokenを取得する
 * {Str}{助詞} -> {Token}"{助詞}"
 *
 * それ以外のNodeの場合は、そのNodeの文字列を取得する
 * {Code}{助詞} -> {Code}"{助詞}"
 * {Strong}{助詞} -> {Strong}"{助詞}"
 *
 * @param token
 * @param tokens
 * @param sentence
 */
const toTextWithPrevWord = (
    token: KuromojiToken,
    {
        tokens,
        sentence
    }: {
        tokens: KuromojiToken[];
        sentence: TxtSentenceNode;
    }
) => {
    const index = tokens.indexOf(token);
    const prevToken = tokens[index - 1];
    // 前のTokenがない場合は、Tokenのsurface_formを返す
    const DEFAULT_RESULT = `"${token.surface_form}"`;
    if (!prevToken) {
        return DEFAULT_RESULT;
    }
    const originalIndex = prevToken.word_position - 1;
    if (originalIndex === undefined) {
        return DEFAULT_RESULT;
    }
    // Tokenの位置に該当するNodeを取得する
    const originalNode = sentence.children.find((node) => {
        return node.range[0] <= originalIndex && originalIndex < node.range[1];
    });
    if (originalNode === undefined) {
        return DEFAULT_RESULT;
    }
    if (originalNode.type === "Str") {
        return `${prevToken.surface_form}"${token.surface_form}"`;
    }
    return `${originalNode.raw}"${token.surface_form}"`;
};
/*
 1. Paragraph Node -> text
 2. text -> sentences
 3. tokenize sentence
 4. report error if found word that match the rule.
 */
const report: TextlintRuleModule<Options> = function (context, options = {}) {
    const helper = new RuleHelper(context);
    // 最低間隔値
    const minInterval = options.min_interval !== undefined ? options.min_interval : defaultOptions.min_interval;
    if (minInterval <= 0) {
        throw new Error("options.min_intervalは1以上の数値を指定してください");
    }
    const isStrict = options.strict || defaultOptions.strict;
    const allow = options.allow || defaultOptions.allow;
    const separatorCharacters = options.separatorCharacters || defaultOptions.separatorCharacters;
    const commaCharacters = options.commaCharacters || defaultOptions.commaCharacters;
    const { Syntax, report, RuleError, locator } = context;
    const is読点Token = create読点Matcher(commaCharacters);
    return {
        [Syntax.Paragraph](node) {
            if (helper.isChildNode(node, [Syntax.Link, Syntax.Image, Syntax.BlockQuote, Syntax.Emphasis])) {
                return;
            }
            const isSentenceNode = (node: SentenceSplitterTxtNode | AnyTxtNode): node is TxtSentenceNode => {
                return node.type === SentenceSplitterSyntax.Sentence;
            };
            const txtParentNode = splitSentences(node, {
                SeparatorParser: {
                    separatorCharacters
                }
            });
            const sentences = txtParentNode.children.filter(isSentenceNode);
            const checkSentence = async (sentence: TxtSentenceNode) => {
                // コードの中身は無視するため、無意味な文字列に置き換える
                const sentenceSource = new StringSource(sentence as StringSourceTxtParentNodeLikeNode, {
                    replacer({ node, maskValue }) {
                        /*
                         * `obj.method` のCode Nodeのように、区切り文字として意味をもつノードがある場合に、
                         * このルールでは単純に無視したいので、同じ文字数で意味のない文字列に置き換える
                         */
                        if (node.type === Syntax.Code) {
                            return maskValue("ー");
                        }
                        return;
                    }
                });
                const text = sentenceSource.toString();
                const tokens = await tokenize(text);
                // 助詞 + 助詞は 一つの助詞として扱う
                // https://github.com/textlint-ja/textlint-rule-no-doubled-joshi/issues/15
                // 連語(助詞)の対応
                // http://www.weblio.jp/parts-of-speech/%E9%80%A3%E8%AA%9E(%E5%8A%A9%E8%A9%9E)_1
                const concatedJoshiTokens = concatJoishiTokens(tokens);
                const countableJoshiTokens = concatedJoshiTokens.filter((token) => {
                    if (isStrict) {
                        return is助詞Token(token);
                    }
                    // デフォルトでは、"、"などを間隔値の距離としてカウントする
                    // "("や")"などもトークンとしてカウントする
                    // xxxx（xxx) xxx でカッコの中と外に距離を一つ増やす目的
                    // https://github.com/textlint-ja/textlint-rule-no-doubled-joshi/issues/31
                    if (is括弧Token(token)) {
                        return true;
                    }
                    // sentence-splitterでセンテンスに区切った場合、 "Xは「カッコ書きの中の文」と言った。" というように、「」の中の文は区切られない
                    // そのため、トークナイズしたトークンで区切り文字となる文字(。や.）があった場合には、カウントを増やす
                    // デフォルトではmin_interval:1 なので、「今日は早朝から出発したが、定刻には間に合わなかった。定刻には間に合わなかったが、無事会場に到着した」のようなものがエラーではなくなる
                    // https://github.com/textlint-ja/textlint-rule-no-doubled-joshi/issues/40
                    if (separatorCharacters.includes(token.surface_form)) {
                        return true;
                    }
                    // "、" があると助詞同士の距離が開くようにすることで、並列的な"、"の使い方を許容する目的
                    // https://github.com/azu/textlint-rule-no-doubled-joshi/issues/2
                    if (is読点Token(token)) {
                        return true;
                    }
                    return is助詞Token(token);
                });
                const joshiTokenSurfaceKeyMap = createSurfaceKeyMap(countableJoshiTokens);
                /*
                    # Data Structure

                    joshiTokens = [tokenA, tokenB, tokenC, tokenD, tokenE, tokenF]
                    joshiTokenSurfaceKeyMap = {
                        "は:助詞.係助詞": [tokenA, tokenC, tokenE],
                        "で:助詞.係助詞": [tokenB, tokenD, tokenF]
                    }
                    */
                Object.keys(joshiTokenSurfaceKeyMap).forEach((key) => {
                    const joshiTokenSurfaceTokens: KuromojiToken[] = joshiTokenSurfaceKeyMap[key];
                    const joshiName = restoreToSurfaceFromKey(key);
                    // check allow
                    if (allow.includes(joshiName)) {
                        return;
                    }
                    // strict mode ではない時例外を除去する
                    if (!isStrict) {
                        if (matchExceptionRule(joshiTokenSurfaceTokens, tokens)) {
                            return;
                        }
                    }
                    if (joshiTokenSurfaceTokens.length <= 1) {
                        return; // no duplicated token
                    }
                    // if found differenceIndex less than
                    // tokes are sorted ascending order
                    joshiTokenSurfaceTokens.reduce((prev, current) => {
                        const startPosition = countableJoshiTokens.indexOf(prev);
                        const otherPosition = countableJoshiTokens.indexOf(current);
                        // 助詞token同士の距離が設定値以下ならエラーを報告する
                        const differenceIndex = otherPosition - startPosition;
                        if (differenceIndex <= minInterval) {
                            // 連続する助詞を集める
                            const startWord = toTextWithPrevWord(prev, {
                                tokens: tokens,
                                sentence: sentence
                            });
                            const endWord = toTextWithPrevWord(current, {
                                tokens: tokens,
                                sentence: sentence
                            });
                            // padding positionを計算する
                            const originalIndex = sentenceSource.originalIndexFromIndex(current.word_position - 1);
                            // originalIndexがない場合は基本的にはないが、ない場合は無視する
                            if (originalIndex === undefined) {
                                return current;
                            }
                            report(
                                // @ts-expect-error: SentenceNodeは独自であるため
                                sentence,
                                new RuleError(
                                    `一文に二回以上利用されている助詞 "${joshiName}" がみつかりました。

次の助詞が連続しているため、文を読みにくくしています。

- ${startWord}
- ${endWord}

同じ助詞を連続して利用しない、文の中で順番を入れ替える、文を分割するなどを検討してください。
`,
                                    {
                                        padding: locator.range([
                                            originalIndex,
                                            originalIndex + current.surface_form.length
                                        ])
                                    }
                                )
                            );
                        }
                        return current;
                    });
                });
            };
            return Promise.all(sentences.map(checkSentence));
        }
    };
};
export default report;
