import { describe, expect, it } from "vitest";
import { foldText, foldedWords, tokenizeWords } from "../../src/keyphrases/text";

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
