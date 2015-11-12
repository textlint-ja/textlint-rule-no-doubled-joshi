// LICENSE : MIT
"use strict";
import kuromoji from "kuromoji";
import path from "path";
const kuromojiDir = require.resolve("kuromoji");
const options = {dicPath: path.join(kuromojiDir, "../../dict") + "/"};
let _tokenizer;
function getTokenizer() {
    if (_tokenizer) {
        return Promise.resolve(_tokenizer);
    }
    return new Promise((resolve, reject) => {
        kuromoji.builder(options).build(function (err, tokenizer) {
            if (err) {
                return reject(err);
            }
            _tokenizer = tokenizer;
            resolve(tokenizer);
        });
    });
}
export default function kuromojin(text) {
    return getTokenizer().then(tokenizer => {
        return tokenizer.tokenize(text);
    })
}