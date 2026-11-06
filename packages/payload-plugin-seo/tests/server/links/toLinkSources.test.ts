import { describe, expect, it } from "vitest";
import { toLinkSources } from "../../../src/server/links/toLinkSources";

const row = (docCollection: string, docId: string, keyphrases: unknown) => ({
  id: `${docCollection}-${docId}`,
  docCollection,
  docId,
  locale: "en",
  keyphrases,
});

describe("toLinkSources", () => {
  it("flattens keyphrases and synonyms per document without duplicates", () => {
    const rows = [
      row("posts", "2", [
        { text: "payload cms", synonyms: ["payload"] },
        { text: "drafts", synonyms: ["payload"] },
      ]),
    ];
    expect(toLinkSources(rows)).toEqual([
      { collection: "posts", docId: "2", phrases: ["payload cms", "payload", "drafts"] },
    ]);
  });

  it("skips rows without usable keyphrases", () => {
    expect(toLinkSources([row("page", "1", "broken"), row("page", "2", [])])).toEqual([]);
  });

  it("dedupes phrases on their folded form, keeping the first spelling", () => {
    const rows = [
      row("posts", "3", [{ text: "Café", synonyms: ["cafe", " CAFÉ ", "café".normalize("NFD")] }]),
    ];
    expect(toLinkSources(rows)).toEqual([{ collection: "posts", docId: "3", phrases: ["Café"] }]);
  });
});
