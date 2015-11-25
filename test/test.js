// LICENSE : MIT
"use strict";
import {TextLintCore} from "textlint";
import rule from "../src/no-doubled-joshi";
import assert from "power-assert";
describe("example-test", function () {
    it("should handle", function () {
        let textlint = new TextLintCore();
        textlint.setupRules({
            "no-doubled-joshi": rule
        });
        return textlint.lintFile(__dirname + "/fixtures/test.md").then(result => {
            assert.equal(result.messages.length, 1);
            let message = result.messages[0];
            assert.deepEqual(message, {
                ruleId: 'no-doubled-joshi',
                message: '一文に二回以上利用されている助詞 "で" がみつかりました。',
                line: 4,
                column: 43,
                severity: 2
            });
        });
    });
});