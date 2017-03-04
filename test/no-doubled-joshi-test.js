import rule from "../src/no-doubled-joshi";
import TextLintTester from "textlint-tester";
const tester = new TextLintTester();
/*
    `**`のような装飾は取り除かれてから評価されているので、
    テストでの強調という意味合いのみで利用する。
 */
tester.run("no-double-joshi", rule, {

    valid: [
        "私は彼が好きだ",
        "既存のコードの利用", // "の" の例外
        "オブジェクトを返す関数を公開した", // "を" の例外
        "私は彼の鼻は好きだ",
        // 、 tokenを距離 + 1 として考える
        "右がiPhone、左がAndroidです。",
        "ナイフで切断した後、ハンマーで破砕した。",
        // 接続助詞のてが重複は許容
        "まずは試していただいて",
        // **に**と**には**は別の助動詞と認識
        "そのため、文字列の長さを正確に測るにはある程度の妥協が必要になります。",
        // 1個目の「と」は格助詞、2個めの「と」は接続助詞
        "ターミナルで「test」**と**入力する**と**、画面に表示されます。",
        {
            text: "太字も強調も同じように無視されます。",
            options: {allow: ["も"]}
        },
        // 全角ピリオドを文区切り文字に含める
        {
            text: "画面に表示されます．それ以外には表示されません．",
            options: {separatorChars: ["。","．","?","!","？","！"]}
        }
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
                    column: 4
                }
            ]
        },
        {
            text: "材料不足で代替素材で製品を作った。",
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 10
                }
            ]
        },
        {
            text: "列車事故でバスで振り替え輸送を行った。 ",
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 8
                }
            ]
        },
        {
            text: "洋服をドラム式洗濯機でお湯と洗剤で洗い、乾燥機で素早く乾燥させる。",
            options: {
                "min_interval": 2
            },
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 17
                },
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 24
                }
            ]
        },
        {
            text: "法律案は十三日の衆議院本会議で賛成多数で可決され、参議院に送付されます",
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 20
                }
            ]
        },
        {
            // 、 で間隔値が+1されるが、strictでは+されない
            text: "彼女は困り切った表情で、小声で尋ねた。",
            options: {
                strict: true
            },
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 15
                }
            ]
        },
        {
            text: "白装束で重力のない足どりでやってくる",
            options: {
                "min_interval": 2
            },
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 13
                }
            ]
        },
        {
            text: "既存のコードの利用",
            options: {
                strict: true
            },
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "の" がみつかりました。`,
                    line: 1,
                    column: 7
                }
            ]
        },
        {
            text: "これは`obj.method`は何をしているかを示します。",
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "は" がみつかりました。`,
                    line: 1,
                    column: 16
                }
            ]
        }, {
            text: "これとあれとそれを持ってきて。",
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "と" がみつかりました。`,
                    line: 1,
                    column: 6
                }
            ]
        },{
            text: `この行にはtextlintによる警告は出ない。
この行にはtextlintにより警告が発せられる。この行に何かしようとすると起きるという
この行にはtextlintによる警告は出ない。
`,
            ext: ".txt",
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "と" がみつかりました。`,
                    line: 2,
                    column: 38
                }
            ]
        },
        {
            // に + は と に + は
            // https://github.com/textlint-ja/textlint-rule-no-doubled-joshi/issues/15
            text: "文字列にはそこには問題がある。",
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "には" がみつかりました。`,
                    line: 1,
                    column: 8
                }
            ]
        }
    ]
});
