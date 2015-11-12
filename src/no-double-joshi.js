// LICENSE : MIT
"use strict";
import kuromojin from "./kuromojin";
import {getSentences} from "./sentence-utils";
export default function (context) {
    let {Syntax, report, getSource, RuleError} = context;
    return {
        [Syntax.Str](node){
            let text = getSource(node);
            let tokenCounter = {};
            return kuromojin(text).then(tokens => {

                tokens.forEach(token => {
                    if (token.pos === "助詞") {
                        if (!tokenCounter[token.surface_form]) {
                            tokenCounter[token.surface_form] = 0;
                        }
                        tokenCounter[token.surface_form]++;
                    }
                });
                Object.keys(tokenCounter).forEach(key => {
                    let count = tokenCounter[key];
                    if (count >= 2) {
                        report(node, new RuleError(`一文に二回以上利用されている助詞 "${key}" がみつかりました。`))
                    }
                });
            })
        }
    }
}