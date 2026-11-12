import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalIntent, foldText, foldedWords, tokenizeWords } from "../../src/keyphrases/text";

describe("foldText", () => {
  it("treats NFC and NFD forms alike", () => {
    expect(foldText("café".normalize("NFC"))).toBe(foldText("café".normalize("NFD")));
  });

  it("lowercases and strips diacritics", () => {
    expect(foldText("Café")).toBe("cafe");
  });

  it("strips accents from Latin letters", () => {
    expect(foldText("Über")).toBe("uber");
    expect(foldText("Příliš žluťoučký kůň")).toBe("prilis zlutoucky kun");
    expect(foldText("canción")).toBe("cancion");
  });

  it("keeps the Spanish ñ apart from n", () => {
    expect(foldText("Año")).toBe("año");
    expect(foldText("año")).not.toBe(foldText("ano"));
  });

  it("keeps Cyrillic letters with marks apart", () => {
    expect(foldText("Йод")).toBe("йод");
    expect(foldText("йод")).not.toBe(foldText("иод"));
  });

  it("keeps Japanese voiced kana apart", () => {
    expect(foldText("がっこう")).toBe("がっこう");
    expect(foldText("がっこう")).not.toBe(foldText("かっこう"));
  });
});

describe("tokenizeWords", () => {
  it("returns words with their offsets", () => {
    expect(tokenizeWords("Hi, e-commerce!")).toEqual([
      { word: "Hi", start: 0, end: 2 },
      { word: "e", start: 4, end: 5 },
      { word: "commerce", start: 6, end: 14 },
    ]);
  });

  it("splits text written without spaces into words", () => {
    expect(tokenizeWords("我喜欢机器学习").map((t) => t.word)).toEqual([
      "我",
      "喜欢",
      "机器",
      "学习",
    ]);
    expect(tokenizeWords("ข้าวผัด")).toEqual([
      { word: "ข้าว", start: 0, end: 4 },
      { word: "ผัด", start: 4, end: 7 },
    ]);
  });

  it("splits words at apostrophes and dots like before", () => {
    expect(tokenizeWords("don’t 3.14").map((t) => t.word)).toEqual(["don", "t", "3", "14"]);
  });

  describe("without Intl.Segmenter", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetModules();
    });

    it("falls back to splitting on non-word characters", async () => {
      vi.stubGlobal("Intl", { ...Intl, Segmenter: undefined });
      vi.resetModules();
      const text = await import("../../src/keyphrases/text");

      expect(text.tokenizeWords("Hi, e-commerce! 机器学习").map((t) => t.word)).toEqual([
        "Hi",
        "e",
        "commerce",
        "机器学习",
      ]);
    });
  });

  it("keeps combining marks inside words", () => {
    expect(tokenizeWords("कि क").map((t) => t.word)).toEqual(["कि", "क"]);
  });
});

describe("foldedWords", () => {
  it("folds every word and drops punctuation", () => {
    expect(foldedWords("  Crème,  BRÛLÉE! ")).toEqual(["creme", "brulee"]);
  });

  it("keeps distinct Devanagari syllables apart", () => {
    expect(foldedWords("कि")).not.toEqual(foldedWords("क"));
  });
});

describe("canonicalIntent", () => {
  it("ignores case and word order", () => {
    expect(canonicalIntent("Payload CMS plugin")).toBe(canonicalIntent("plugin payload cms"));
  });

  it("ignores accents and punctuation", () => {
    expect(canonicalIntent("Café, crème!")).toBe("cafe creme");
  });

  it("collapses whitespace", () => {
    expect(canonicalIntent("  headless   cms ")).toBe("cms headless");
  });

  it("returns an empty string for blank input", () => {
    expect(canonicalIntent("  ,. ")).toBe("");
  });

  it("keeps different phrases apart", () => {
    expect(canonicalIntent("payload cms")).not.toBe(canonicalIntent("payload"));
  });

  it("matches NFC and NFD spellings", () => {
    expect(canonicalIntent("café".normalize("NFD"))).toBe(canonicalIntent("cafe"));
  });

  it("keeps combining marks that are part of a word", () => {
    expect(canonicalIntent("कि")).not.toBe(canonicalIntent("क"));
  });

  it("splits text without spaces into words", () => {
    expect(canonicalIntent("机器学习")).toBe(canonicalIntent("学习 机器"));
    expect(canonicalIntent("ข้าวผัด")).not.toBe(canonicalIntent("ข้าว"));
  });
});
