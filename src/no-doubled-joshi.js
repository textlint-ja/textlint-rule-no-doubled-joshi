// LICENSE : MIT
"use strict";
import {RuleHelper} from "textlint-rule-helper";
import {getTokenizer} from "kuromojin";
import splitSentences, {Syntax as SentenceSyntax} from "sentence-splitter";
import StringSource from "textlint-util-to-string";
/**
 * create a object that
 * map ={
 *   // these token.surface_form === "Hoge"
 *  "Hoge" [token, token]
 * }
 * @param tokens
 * @returns {*}
 */
function createSurfaceKeyMap(tokens) {
    return tokens.reduce((keyMap, token) => {
        // "は" : [token]
        if (!keyMap[token.surface_form]) {
            keyMap[token.surface_form] = [];
        }
        keyMap[token.surface_form].push(token);
        return keyMap;
    }, {});
}
function matchExceptionRule(tokens) {
    let token = tokens[0];
    // "の" の重なりは例外
    if (token.pos_detail_1 === "連体化") {
        return true;
    }
    // "を" の重なりは例外
    if (token.pos_detail_1 === "格助詞" && token.surface_form === "を") {
        return true;
    }
    return false;
}
/*
    default options
 */
const defaultOptions = {
    min_interval: 1,
    strict: false
};


/*
    1. Paragraph Node -> text
    2. text -> sentences
    3. tokenize sentence
    4. report error if found word that match the rule.

    TODO: need abstraction
 */
export default function (context, options = {}) {
    const helper = new RuleHelper(context);
    // 最低間隔値
    const minInterval = options.min_interval || defaultOptions.min_interval;
    const isStrict = options.strict || defaultOptions.strict;
    const {Syntax, report, getSource, RuleError} = context;
    return {
        [Syntax.Paragraph](node){
            if (helper.isChildNode(node, [Syntax.Link, Syntax.Image, Syntax.BlockQuote, Syntax.Emphasis])) {
                return;
            }
            const source = new StringSource(node);
            const text = source.toString();
            const isSentenceNode = node => {
                return node.type === SentenceSyntax.Sentence;
            };
            let sentences = splitSentences(text, {
                charRegExp: /[。\?\!？！]/
            }).filter(isSentenceNode);
            return getTokenizer().then(tokenizer => {
                const checkSentence = (sentence) => {
                    let tokens = tokenizer.tokenizeForSentence(sentence.raw);
                    const isJoshiToken = token => {
                        return token.pos === "助詞";
                    };
                    let joshiTokens = tokens.filter(isJoshiToken);
                    let joshiTokenSurfaceKeyMap = createSurfaceKeyMap(joshiTokens);
                    /*
                    # Data Structure

                        joshiTokens = [tokenA, tokenB, tokenC, tokenD, tokenE, tokenF]
                        joshiTokenSurfaceKeyMap = {
                            "は": [tokenA, tokenC, tokenE],
                            "で": [tokenB, tokenD, tokenF]
                        }
                     */
                    Object.keys(joshiTokenSurfaceKeyMap).forEach(key => {
                        let tokens = joshiTokenSurfaceKeyMap[key];
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
                            let startPosition = joshiTokens.indexOf(prev);
                            let otherPosition = joshiTokens.indexOf(current);
                            // if difference
                            let differenceIndex = otherPosition - startPosition;
                            if (differenceIndex <= minInterval) {
                                let originalPosition = source.originalPositionFor({
                                    line: sentence.loc.start.line,
                                    column: sentence.loc.start.column + (current.word_position - 1)
                                });
                                // padding position
                                var padding = {
                                    line: originalPosition.line - 1,
                                    // matchLastToken.word_position start with 1
                                    // this is padding column start with 0 (== -1)
                                    column: originalPosition.column
                                };
                                report(node, new RuleError(`一文に二回以上利用されている助詞 "${key}" がみつかりました。`, padding));
                            }
                            return current;
                        });
                    });
                };
                sentences.forEach(checkSentence);
            });
        }
    }
};