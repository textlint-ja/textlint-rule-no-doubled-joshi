import TextLintTester from "textlint-tester";
import rule from "../src/no-doubled-joshi";

const tester = new TextLintTester();
tester.run("no-double-joshi", rule, {
    valid: [
        "私は彼が好きだ",
        "既存のコードの利用", // "の" の例外
        "オブジェクトを返す関数を公開した", // "を" の例外
        "私は彼の鼻は好きだ",
        // 、 と ，をtokenを距離 + 1 として考える
        "これがiPhone、これがAndroidです。",
        "これがiPhone，これがAndroidです。",
        "ナイフで切断した後、ハンマーで破砕した。",
        // 接続助詞のてが重複は許容
        "まずは試していただいて",
        // **に**と**には**は別の助動詞と認識
        "そのため、文字列の長さを正確に測るにはある程度の妥協が必要になります。",
        "そんな事で言うべきではない。",
        "言うのは簡単の法則。",
        // 品詞細分類2の一致を見ている
        // "しようとすると" と には次の違いある
        // と	助詞	格助詞	一般 *
        // と	助詞	接続助詞	*	*
        "削除しようとすると問題が発生する",
        // kuromojiだと品詞細分類2が次の単語で変わる
        // https://github.com/textlint-ja/textlint-rule-no-doubled-joshi/issues/29
        "削除しようとするとエラーが発生する",
        // 並立助詞
        "台に登ったり降りたりする",
        "AとBとCを持ってきて",
        // fix regression - https://travis-ci.org/textlint-ja/textlint-rule-preset-ja-technical-writing/builds/207700760#L720
        "慣用的表現、熟語、概数、固有名詞、副詞など、漢数字を使用することが一般的な語句では漢数字を使います。",
        // カッコ内は別のセンテンスとしてみなす
        // https://github.com/textlint-ja/textlint-rule-no-doubled-joshi/issues/31
        " 次の`escapeHTML`関数は**タグ関数**です（詳細は文字列の章を参照）。",
        // 1個目の「と」は格助詞、2個めの「と」は接続助詞
        "ターミナルで「test」**と**入力する**と**、画面に表示されます。",
        // 格助詞の種類が異なる
        // "プロパティを削除しようとするとエラーが発生します。",
        {
            text: "太字も強調も同じように無視されます。",
            options: { allow: ["も"] },
        },
        // 区切り文字をカスタムする
        // ♪を区切り文字としたので、次の文は2つのセンテンスになる
        {
            text: "これはペンです♪これは鉛筆です♪",
            options: { separatorCharacters: ["♪"] },
        },
        // ,を読点とみなす
        {
            text: "これがiPhone,これがAndroidです。",
            options: { commaCharacters: [","] },
        },
    ],
    invalid: [
        // エラー位置は最後の助詞の位置を表示する
        {
            text: "私は彼は好きだ",
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "は" がみつかりました。`,
                    // last match
                    line: 1,
                    column: 4,
                },
            ],
        },
        {
            text: "材料不足で代替素材で製品を作った。",
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 10,
                },
            ],
        },
        {
            text: "クォートで囲むことで文字列を作成できる点は、他の文字列リテラルと同じです。",
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    index: 9,
                },
            ],
        },
        {
            text: "列車事故でバスで振り替え輸送を行った。 ",
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 8,
                },
            ],
        },
        {
            text: "洋服をドラム式洗濯機でお湯と洗剤で洗い、乾燥機で素早く乾燥させる。",
            options: {
                min_interval: 2,
            },
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 17,
                },
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 24,
                },
            ],
        },
        {
            text: "法律案は十三日の衆議院本会議で賛成多数で可決され、参議院に送付されます",
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 20,
                },
            ],
        },
        {
            // 、 で間隔値が+1されるが、strictでは+されない
            text: "彼女は困り切った表情で、小声で尋ねた。",
            options: {
                strict: true,
            },
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 15,
                },
            ],
        },
        {
            text: "白装束で重力のない足どりでやってくる",
            options: {
                min_interval: 2,
            },
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 13,
                },
            ],
        },
        {
            text: "既存のコードの利用",
            options: {
                strict: true,
            },
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "の" がみつかりました。`,
                    line: 1,
                    column: 7,
                },
            ],
        },
        {
            text: "これは`obj.method`は何をしているかを示します。",
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "は" がみつかりました。`,
                    line: 1,
                    column: 16,
                },
            ],
        },
        {
            // に + は と に + は
            // https://github.com/textlint-ja/textlint-rule-no-doubled-joshi/issues/15
            text: "文字列にはそこには問題がある。",
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "には" がみつかりました。`,
                    line: 1,
                    column: 8,
                },
            ],
        },
        //
        {
            text: `今まで、サイトはNetlifyスライドはGitLab Pagesといった配信分けをしていたのですが、
「 \`/slides\` にビルドしたスライドを置きたい」という動機のものと、こんな構成を検討しています。

* 最初にtextlintで文法チェック
* ドキュメントを別にビルドしてarticle化
* 複数articleを束ねてFirebaseへデプロイ`,
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "は" がみつかりました。`,
                    index: 19,
                },
            ],
        },
        // オプションで、全角ピリオドを読点として認識させなくする
        // 次のtextは1つのセンテンスとして認識されるので、"は"が重複する
        {
            text: "これはペンです．これは鉛筆です．",
            options: { separatorCharacters: ["。"] },
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "は" がみつかりました。`,
                    index: 10,
                },
            ],
        },
        // 、を読点と認識させなくする
        {
            text: "これがiPhone、これがAndroidです。",
            options: { commaCharacters: [] },
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "が" がみつかりました。`,
                    index: 12,
                },
            ],
        },
    ],
});
