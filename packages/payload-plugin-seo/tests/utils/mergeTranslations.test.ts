import { describe, expect, it } from "vitest";
import { mergeTranslations } from "../../src/utils/config/mergeTranslations";

describe("mergeTranslations", () => {
  it("deep-merges per-locale string maps, override winning", () => {
    const base = { en: { a: "1", b: "2" } };
    const extra = { en: { b: "two", c: "3" }, de: { a: "eins" } };
    expect(mergeTranslations(base, extra)).toEqual({
      en: { a: "1", b: "two", c: "3" },
      de: { a: "eins" },
    });
  });

  it("returns base unchanged when extra is empty", () => {
    expect(mergeTranslations({ en: { a: "1" } }, {})).toEqual({ en: { a: "1" } });
  });
});
