// LICENSE : MIT
"use strict";
import {getTokenizer} from "./kuromojin";
import kuromojin from "./kuromojin";
import splitSentences from "./sentence-splitter";
export default function (context) {
    let {Syntax, report, getSource, RuleError} = context;
    let tokenizer = null;
    return {
        [Syntax.Str](node){
            let text = getSource(node);
            let sentences = splitSentences(text);
            return getTokenizer().then(tokenizer => {
                sentences.forEach(sentence => {
                    let tokenCounter = {};
                    let tokens = tokenizer.tokenize(sentence.raw);
                    let matchLastToken = null;
                    tokens.forEach(token => {
                        if (token.pos === "助詞") {
                            if (!tokenCounter[token.surface_form]) {
                                tokenCounter[token.surface_form] = {
                                    count: 0
                                };
                            }
                            tokenCounter[token.surface_form].count++;
                            tokenCounter[token.surface_form].matchLastToken = token;
                        }
                    });
                    Object.keys(tokenCounter).forEach(key => {
                        let count = tokenCounter[key].count;
                        let matchLastToken = tokenCounter[key].matchLastToken;
                        if (count >= 2) {
                            report(node, new RuleError(`一文に二回以上利用されている助詞 "${key}" がみつかりました。`, {
                                line: sentence.loc.start.line - 1,
                                // matchLastToken.word_position start with 1
                                // this is padding column start with 0 (== -1)
                                column: sentence.loc.start.column + (matchLastToken.word_position - 1)
                            }))
                        }
                    });
                });
            });
        }
    }
}