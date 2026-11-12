import { describe, expect, it } from "vitest";
import { mergeTranslations } from "../../src/utils/config/mergeTranslations";

describe("mergeTranslations", () => {
  it("merges per language and per namespace, extra winning", () => {
    const base = { en: { seo: { a: "1", b: "2" }, custom: { x: "app" } } };
    const extra = { en: { seo: { b: "two", c: "3" } }, de: { seo: { a: "eins" } } };
    expect(mergeTranslations(base, extra)).toEqual({
      en: { seo: { a: "1", b: "two", c: "3" }, custom: { x: "app" } },
      de: { seo: { a: "eins" } },
    });
  });

  it("returns base unchanged when extra is empty", () => {
    expect(mergeTranslations({ en: { seo: { a: "1" } } }, {})).toEqual({ en: { seo: { a: "1" } } });
  });
});
