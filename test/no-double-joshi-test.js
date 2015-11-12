import assert from "power-assert";
import rule from "../src/no-double-joshi";
import {TextLintCore} from "textlint";
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
        }
    ]
});