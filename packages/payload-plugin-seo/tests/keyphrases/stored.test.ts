import { describe, expect, it } from "vitest";
import {
  MAX_KEYPHRASES,
  MAX_KEYPHRASE_LENGTH,
  MAX_SYNONYMS,
  MAX_SYNONYM_LENGTH,
} from "../../src/constants";
import { sanitizeStoredKeyphrases } from "../../src/keyphrases/stored";

describe("sanitizeStoredKeyphrases", () => {
  it("returns [] for anything that is not an array", () => {
    expect(sanitizeStoredKeyphrases(null)).toEqual([]);
    expect(sanitizeStoredKeyphrases({ text: "a" })).toEqual([]);
  });

  it("keeps text and string synonyms only", () => {
    expect(
      sanitizeStoredKeyphrases([{ text: "payload cms", synonyms: ["payload", 3, null], extra: 1 }])
    ).toEqual([{ text: "payload cms", synonyms: ["payload"] }]);
  });

  it("drops entries without text or with blank text", () => {
    expect(sanitizeStoredKeyphrases([{ text: " " }, { synonyms: [] }, "x", { text: "a" }])).toEqual(
      [{ text: "a", synonyms: [] }]
    );
  });

  it("caps the list at MAX_KEYPHRASES", () => {
    const many = Array.from({ length: MAX_KEYPHRASES + 2 }, (_, i) => ({ text: `k${i}` }));
    expect(sanitizeStoredKeyphrases(many)).toHaveLength(MAX_KEYPHRASES);
  });

  it("trims the text", () => {
    expect(sanitizeStoredKeyphrases([{ text: "  payload cms " }])).toEqual([
      { text: "payload cms", synonyms: [] },
    ]);
  });

  it("caps the text length", () => {
    const [entry] = sanitizeStoredKeyphrases([{ text: "a".repeat(MAX_KEYPHRASE_LENGTH + 5) }]);
    expect(entry?.text).toHaveLength(MAX_KEYPHRASE_LENGTH);
  });

  it("caps the number and length of synonyms", () => {
    const synonyms = Array.from({ length: MAX_SYNONYMS + 3 }, () =>
      "s".repeat(MAX_SYNONYM_LENGTH + 5)
    );
    const [entry] = sanitizeStoredKeyphrases([{ text: "a", synonyms }]);
    expect(entry?.synonyms).toHaveLength(MAX_SYNONYMS);
    for (const synonym of entry?.synonyms ?? []) expect(synonym).toHaveLength(MAX_SYNONYM_LENGTH);
  });
});
