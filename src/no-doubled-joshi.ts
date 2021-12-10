// LICENSE : MIT
"use strict";
import { RuleHelper } from "textlint-rule-helper";
import { splitAST as splitSentences, Syntax as SentenceSyntax, SentenceNode } from "sentence-splitter";
import { tokenize, KuromojiToken } from "kuromojin";
import {
    is助詞Token,
    create読点Matcher,
    concatJoishiTokens,
    createKeyFromKey,
    restoreToSurfaceFromKey,
    is括弧Token,
} from "./token-utils";
import { TxtNode } from "@textlint/ast-node-types";
import { TextlintRuleModule } from "@textlint/types";
import { StringSource } from "textlint-util-to-string";

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
    return tokens.filter(is助詞Token).reduce((keyMap, token) => {
        // "は:助詞.係助詞" : [token]
        const tokenKey = createKeyFromKey(token);
        if (!keyMap[tokenKey]) {
            keyMap[tokenKey] = [];
        }
        keyMap[tokenKey].push(token);
        return keyMap;
    }, {} as { [index: string]: KuromojiToken[] });
}

function matchExceptionRule(tokens: KuromojiToken[]) {
    const token = tokens[0];
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
    if (tokens.length === 2 && tokens[0].pos_detail_1 === "並立助詞" && tokens[1].pos_detail_1 === "並立助詞") {
        return true;
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
        "！", // (ja) zenkaku exclamation mark
    ],
    commaCharacters: [
        "、",
        "，", // 全角カンマ
    ],
};

export interface Options {
    /**
     * 助詞の最低間隔値
     * 指定した間隔値以下で同じ助詞が出現した場合エラーが出力されます
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

/*
 1. Paragraph Node -> text
 2. text -> sentences
 3. tokenize sentence
 4. report error if found word that match the rule.

 TODO: need abstraction
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
    const { Syntax, report, RuleError } = context;
    const is読点Token = create読点Matcher(commaCharacters);
    return {
        [Syntax.Paragraph](node) {
            if (helper.isChildNode(node, [Syntax.Link, Syntax.Image, Syntax.BlockQuote, Syntax.Emphasis])) {
                return;
            }
            const isSentenceNode = (node: TxtNode): node is SentenceNode => {
                return node.type === SentenceSyntax.Sentence;
            };
            const txtParentNode = splitSentences(node, {
                SeparatorParser: {
                    separatorCharacters,
                },
            });
            const sentences = txtParentNode.children.filter(isSentenceNode);
            const checkSentence = async (sentence: SentenceNode) => {
                const sentenceSource = new StringSource(sentence);
                const text = sentenceSource.toString();
                const tokens = await tokenize(text);
                // 助詞 + 助詞は 一つの助詞として扱う
                // https://github.com/textlint-ja/textlint-rule-no-doubled-joshi/issues/15
                // 連語(助詞)の対応
                // http://www.weblio.jp/parts-of-speech/%E9%80%A3%E8%AA%9E(%E5%8A%A9%E8%A9%9E)_1
                const concatTokens = concatJoishiTokens(tokens);
                const countableTokens = concatTokens.filter((token) => {
                    if (isStrict) {
                        return is助詞Token(token);
                    }
                    // "("や")"などもトークンとしてカウントする
                    // xxxx（xxx) xxx でカッコの中と外に距離を一つ増やす目的
                    // https://github.com/textlint-ja/textlint-rule-no-doubled-joshi/issues/31
                    if (is括弧Token(token)) {
                        return true;
                    }
                    // "、" があると助詞同士の距離が開くようにすることで、並列的な"、"の使い方を許容する目的
                    // https://github.com/azu/textlint-rule-no-doubled-joshi/issues/2
                    if (is読点Token(token)) {
                        return true;
                    }
                    // デフォルトでは、"、"を間隔値の距離としてカウントする
                    return is助詞Token(token);
                });
                const joshiTokenSurfaceKeyMap = createSurfaceKeyMap(countableTokens);
                /*
                    # Data Structure

                    joshiTokens = [tokenA, tokenB, tokenC, tokenD, tokenE, tokenF]
                    joshiTokenSurfaceKeyMap = {
                        "は:助詞.係助詞": [tokenA, tokenC, tokenE],
                        "で:助詞.係助詞": [tokenB, tokenD, tokenF]
                    }
                    */
                Object.keys(joshiTokenSurfaceKeyMap).forEach((key) => {
                    const tokens: KuromojiToken[] = joshiTokenSurfaceKeyMap[key];
                    const joshiName = restoreToSurfaceFromKey(key);
                    // check allow
                    if (allow.indexOf(joshiName) >= 0) {
                        return;
                    }
                    // strict mode ではない時例外を除去する
                    if (!isStrict) {
                        if (matchExceptionRule(tokens)) {
                            return;
                        }
                    }
                    if (tokens.length <= 1) {
                        return; // no duplicated token
                    }
                    // if found differenceIndex less than
                    // tokes are sorted ascending order
                    tokens.reduce((prev, current) => {
                        const startPosition = countableTokens.indexOf(prev);
                        const otherPosition = countableTokens.indexOf(current);
                        // 助詞token同士の距離が設定値以下ならエラーを報告する
                        const differenceIndex = otherPosition - startPosition;
                        if (differenceIndex <= minInterval) {
                            // padding positionを計算する
                            const originalIndex = sentenceSource.originalIndexFromIndex(current.word_position - 1);
                            report(
                                sentence,
                                new RuleError(
                                    `一文に二回以上利用されている助詞 "${joshiName}" がみつかりました。`,
                                    {
                                        index: originalIndex,
                                    }
                                )
                            );
                        }
                        return current;
                    });
                });
            };
            return Promise.all(sentences.map(checkSentence));
        },
    };
};
export default report;
