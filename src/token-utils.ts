// LICENSE : MIT
"use strict";

import { KuromojiToken } from "kuromojin";

// 助詞どうか
export const is助詞Token = (token: KuromojiToken) => {
    // 結合しているtokenは助詞助詞のようになってるため先頭一致で見る
    return token && /^助詞/.test(token.pos);
};

export const is括弧Token = (token: KuromojiToken) => {
    return token && token.pos === "記号" && (token.pos_detail_1 === "括弧開" || token.pos_detail_1 === "括弧閉");
};

/**
 * 読点を判定する関数を返す
 * 注意: 名詞や記号ではないトークンは読点として扱えない
 * @param commaCharacters
 */
export const create読点Matcher = (commaCharacters: string[]) => {
    return function is読点Token(token: KuromojiToken) {
        return (
            commaCharacters.includes(token.surface_form) &&
            // 、や, は名詞扱いの場合がある(0.1.2で記号となる)
            (token.pos === "名詞" ||
                // ，は記号 && 読点となる(surface_formを優先するために pos_detail_1/読点 のチェックを省く)
                token.pos === "記号")
        );
    };
};
/**
 * aTokenの_extraKeyに結合したkeyを追加する
 * @param {Object} aToken
 * @param {Object} bToken
 * @returns {Object}
 */
const concatToken = (aToken: KuromojiToken, bToken: KuromojiToken) => {
    aToken.surface_form += bToken.surface_form;
    aToken.pos += bToken.pos;
    aToken.pos_detail_1 += bToken.surface_form;
    return aToken;
};
/**
 * 助詞+助詞 というように連続しているtokenを結合し直したtokenの配列を返す
 * @param {Array} tokens
 * @returns {Array}
 */
export const concatJoishiTokens = (tokens: KuromojiToken[]) => {
    const newTokens: KuromojiToken[] = [];
    tokens.forEach((token) => {
        const prevToken = newTokens[newTokens.length - 1];
        if (is助詞Token(token) && is助詞Token(prevToken)) {
            newTokens[newTokens.length - 1] = concatToken(prevToken, token);
        } else {
            newTokens.push(token);
        }
    });
    return newTokens;
};
// 助詞tokenから品詞細分類1までを元にしたkeyを作る
// http://www.unixuser.org/~euske/doc/postag/index.html#chasen
// http://chasen.naist.jp/snapshot/ipadic/ipadic/doc/ipadic-ja.pdf
export const createKeyFromKey = (token: KuromojiToken) => {
    // e.g.) "は:助詞.係助詞.*.*"
    // "しようとすると" と には次の違いある
    // と	助詞	格助詞	一般 *
    // と	助詞	接続助詞	*	*
    return `${token.surface_form}:${token.pos}.${token.pos_detail_1}.${token.pos_detail_2}.${token.pos_detail_3}`;
};
// keyからsurfaceを取り出す
export const restoreToSurfaceFromKey = (key: string) => {
    return key.split(":")[0];
};
