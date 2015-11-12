// LICENSE : MIT
"use strict";
import StructureSource from "structured-source";
function isNotEmpty(text) {
    if (!text) {
        return false;
    }
    return text.trim().length > 0;
}
export function getSentences(text) {
    const src = new StructureSource(text);
    let results = [];
    let startPoint = 0;
    let isSplitPoint = false;
    let currentIndex = 0;
    for (;currentIndex < text.length; currentIndex++) {
        let char = text[currentIndex];
        if (char === "\n") {
            isSplitPoint = true;
        } else if (char === ".") {
            isSplitPoint = true;
        } else if (char === "。") {
            isSplitPoint = true;
        } else {
            if (isSplitPoint) {
                let range = [startPoint, currentIndex];
                let location = src.rangeToLocation(range);
                results.push(createSentenceNode(text.slice(startPoint, currentIndex), location, range));
                startPoint = currentIndex;
                isSplitPoint = false;
            }
        }
    }
    let range = [startPoint, currentIndex];
    let location = src.rangeToLocation(range);
    results.push(createSentenceNode(text.slice(startPoint, currentIndex), location, range));

    return results;
}
export function createSentenceNode(text, loc, range) {
    return {
        type: "Sentence",
        raw: text,
        loc: loc,
        range: range
    }
}