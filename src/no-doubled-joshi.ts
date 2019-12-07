// LICENSE : MIT
"use strict";
import { RuleHelper } from "textlint-rule-helper";
import { splitAST as splitSentences, Syntax as SentenceSyntax, SentenceNode } from "sentence-splitter";
import { getTokenizer, KuromojiToken } from "kuromojin";
import {
    is助詞Token, is読点Token,
    concatJoishiTokens,
    createKeyFromKey,
    restoreToSurfaceFromKey
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
    let token = tokens[0];
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
    return false;
}

/*
 default options
 */
const defaultOptions = {
    min_interval: 1,
    strict: false,
    allow: [],
    separatorChars: [
        ".", // period
        "．", // (ja) zenkaku-period
        "。", // (ja) 句点
        "?", // question mark
        "!", //  exclamation mark
        "？", // (ja) zenkaku question mark
        "！" // (ja) zenkaku exclamation mark
    ]
};


export interface Options {
    min_interval?: number;
    strict?: boolean;
    allow?: string[];
    separatorChars?: string[]
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
    const minInterval = options.min_interval || defaultOptions.min_interval;
    const isStrict = options.strict || defaultOptions.strict;
    const allow = options.allow || defaultOptions.allow;
    const separatorChars = options.separatorChars || defaultOptions.separatorChars;
    const {Syntax, report, RuleError} = context;
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
                    separatorCharacters: separatorChars
                }
            });
            const sentences = txtParentNode.children.filter(isSentenceNode);
            return getTokenizer().then((tokenizer: any) => {
                const checkSentence = (sentence: SentenceNode) => {
                    const sentenceSource = new StringSource(sentence);
                    const text = sentenceSource.toString();
                    const tokens = tokenizer.tokenizeForSentence(text);
                    // 助詞 + 助詞は 一つの助詞として扱う
                    // https://github.com/textlint-ja/textlint-rule-no-doubled-joshi/issues/15
                    // 連語(助詞)の対応
                    // http://www.weblio.jp/parts-of-speech/%E9%80%A3%E8%AA%9E(%E5%8A%A9%E8%A9%9E)_1
                    const concatTokens = concatJoishiTokens(tokens);
                    const countableTokens = concatTokens.filter(token => {
                        if (isStrict) {
                            return is助詞Token(token);
                        }
                        // デフォルトでは、"、"を間隔値の距離としてカウントする
                        // "、" があると助詞同士の距離が開くようにすることで、並列的な"、"の使い方を許容する目的
                        // https://github.com/azu/textlint-rule-no-doubled-joshi/issues/2
                        return is助詞Token(token) || is読点Token(token);
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
                    Object.keys(joshiTokenSurfaceKeyMap).forEach(key => {
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
                            return;// no duplicated token
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
                                report(sentence, new RuleError(`一文に二回以上利用されている助詞 "${joshiName}" がみつかりました。`, {
                                    index: originalIndex
                                }));
                            }
                            return current;
                        });
                    });
                };
                sentences.forEach(node => checkSentence(node))
            });
        }
    }
};
export default report;
