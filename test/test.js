// LICENSE : MIT
"use strict";
import {TextLintCore} from "textlint";
import rule from "../src/no-doubled-joshi";
describe("text", function () {
    it("should handle", function () {
        let textlint = new TextLintCore();
        textlint.setupRules({
            "no-doubled-joshi": rule
        });
        return textlint.lintFile(__dirname + "/fixtures/test.md").then(result => {
            console.log(result);
        });
    });
});