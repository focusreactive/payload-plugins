import { Paper } from "yoastseo";
import { describe, expect, it, vi } from "vitest";
import { deriveVitals } from "../../src/engine/runAnalysis/services/derive-vitals";

// Mirrors the real yoastseo@3.6.0 return shapes, verified against
// node_modules/yoastseo/build/languageProcessing/researches/*:
//  - getProminentWordsForInsights returns a bare WordCombination[]
//  - getProminentWordsForInternalLinking returns a COMPOUND object
//    { prominentWords: ProminentWord[] }, NOT an array.
//
// deriveVitals now builds its researcher from the paper internally, so the
// stubbed shapes are injected by mocking makeResearcher.
const { researcher } = vi.hoisted(() => {
  function word(w: string, occ: number) {
    return { getWord: () => w, getOccurrences: () => occ };
  }

  return {
    researcher: {
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
    },
  };
});

vi.mock("../../src/engine/researcherAdapter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/engine/researcherAdapter")>();

  return { ...actual, makeResearcher: () => researcher };
});

describe("deriveVitals", () => {
  it("reads internalLinkingPhrases from the compound internal-linking research object", () => {
    const v = deriveVitals(new Paper(""), "running shoes");
    expect(v.internalLinkingPhrases).toEqual(["trail", "marathon"]);
    expect(v.prominentWords.map((p) => p.word)).toEqual(["running", "shoes"]);
  });
});
