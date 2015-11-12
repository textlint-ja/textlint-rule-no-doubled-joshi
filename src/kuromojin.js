// LICENSE : MIT
"use strict";
import kuromoji from "kuromoji";
import path from "path";
const kuromojiDir = require.resolve("kuromoji");
const options = {dicPath: path.join(kuromojiDir, "../../dict") + "/"};
// cache for tokenizer
let _tokenizer = null;
// lock boolean
let isLoading = false;
class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

let deferred = new Deferred();
export function getTokenizer() {
    if (_tokenizer) {
        return Promise.resolve(_tokenizer);
    }
    if (isLoading) {
        return deferred.promise;
    }
    isLoading = true;
    // load dict
    kuromoji.builder(options).build(function (err, tokenizer) {
        if (err) {
            return deferred.reject(err);
        }
        _tokenizer = tokenizer;
        deferred.resolve(tokenizer);
    });
    return deferred.promise;
}
export default function kuromojin(text) {
    return getTokenizer().then(tokenizer => {
        return tokenizer.tokenize(text);
    })
}