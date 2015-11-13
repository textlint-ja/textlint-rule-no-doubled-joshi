import assert from "power-assert";
import rule from "../src/no-doubled-joshi";
import TextLintTester from "textlint-tester";
var tester = new TextLintTester();
tester.run("no-double-joshi", rule, {
    valid: [
        "私は彼が好きだ"
    ],
    invalid: [
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
            text: "彼女は困り切った表情で、小声で尋ねた。",
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
            errors: [
                {
                    message: `一文に二回以上利用されている助詞 "で" がみつかりました。`,
                    line: 1,
                    column: 13
                }
            ]
        }
    ]
});