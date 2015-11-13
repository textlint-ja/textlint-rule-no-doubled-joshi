// LICENSE : MIT
"use strict";
import {getTokenizer} from "kuromojin";
import splitSentences, {Syntax as SentenceSyntax} from "sentence-splitter";
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
export default function (context) {
    let {Syntax, report, getSource, RuleError} = context;
    return {
        [Syntax.Str](node){
            let text = getSource(node);
            let sentences = splitSentences(text).filter(node => {
                return node.type === SentenceSyntax.Sentence;
            });
            return getTokenizer().then(tokenizer => {
                sentences.forEach(sentence => {
                    let tokens = tokenizer.tokenizeForSentence(sentence.raw);
                    let joshiTokens = tokens.filter(token => {
                        return token.pos === "助詞";
                    });
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
                        if (tokens.length <= 1) {
                            return;// no duplicated token
                        }
                        // if found differenceIndex less than
                        tokens.reduce((prev, current) => {
                            let startPosition = joshiTokens.indexOf(prev);
                            let otherPosition = joshiTokens.indexOf(current);
                            // if difference
                            let differenceIndex = otherPosition - startPosition;
                            if (differenceIndex <= 2) {
                                report(node, new RuleError(`一文に二回以上利用されている助詞 "${key}" がみつかりました。`, {
                                    line: sentence.loc.start.line - 1,
                                    // matchLastToken.word_position start with 1
                                    // this is padding column start with 0 (== -1)
                                    column: sentence.loc.start.column + (current.word_position - 1)
                                }));
                            }
                            return current;
                        });
                    });
                });
            });
        }
    }
}