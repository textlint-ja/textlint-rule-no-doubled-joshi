// LICENSE : MIT
"use strict";
// 助詞どうか
export const is助詞Token = (token) => {
    return token.pos === "助詞";
};

export const is読点Token = (token) => {
    return token.surface_form === "、" && token.pos === "名詞";
};

// 助詞tokenから品詞細分類1までを元にしたkeyを作る
// http://www.unixuser.org/~euske/doc/postag/index.html#chasen
// http://chasen.naist.jp/snapshot/ipadic/ipadic/doc/ipadic-ja.pdf
export const createKeyFromKey = (token) => {
    // e.g.) "は:助詞.係助詞"
    return `${token.surface_form}:${token.pos}.${token.pos_detail_1}`
};
// keyからsurfaceを取り出す
export const restoreToSurfaceFromKey = (key) => {
    return key.split(":")[0];
};