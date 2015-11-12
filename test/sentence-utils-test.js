var assert = require("power-assert");
import {getSentences } from "../src/sentence-utils";
describe("sentence-utils", function () {
    it("should return array", function () {
        let sentences = getSentences("text\n\ntest");
        console.log(JSON.stringify(sentences));
    });
});