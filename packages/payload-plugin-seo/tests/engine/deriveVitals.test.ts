import { describe, expect, it } from "vitest";
import { deriveVitals } from "../../src/engine/deriveVitals";
import type { YoastResearcher } from "../../src/engine/researcherAdapter";

// Mirrors the real yoastseo@3.6.0 return shapes, verified against
// node_modules/yoastseo/build/languageProcessing/researches/*:
//  - getProminentWordsForInsights returns a bare WordCombination[]
//  - getProminentWordsForInternalLinking returns a COMPOUND object
//    { prominentWords: ProminentWord[] }, NOT an array.
function word(w: string, occ: number) {
  return { getWord: () => w, getOccurrences: () => occ };
}

const researcher: YoastResearcher = {
  getResearch: (name: string) => {
    switch (name) {
      case "wordCountInText":
        return 250;
      case "countSentencesFromText":
        return ["a", "b", "c"];
      case "getParagraphs":
        return ["p1", "p2"];
      case "imageCount":
        return 1;
      case "videoCount":
        return 0;
      case "readingTime":
        return 2;
      case "getProminentWordsForInsights":
        return [word("running", 9), word("shoes", 7)];
      case "getProminentWordsForInternalLinking":
        return { prominentWords: [word("trail", 4), word("marathon", 3)] };
      default:
        return undefined;
    }
  },
};

describe("deriveVitals", () => {
  it("reads internalLinkingPhrases from the compound internal-linking research object", () => {
    const v = deriveVitals(researcher, "running shoes");
    expect(v.internalLinkingPhrases).toEqual(["trail", "marathon"]);
    expect(v.prominentWords.map((p) => p.word)).toEqual(["running", "shoes"]);
  });
});
