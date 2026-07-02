import { describe, expect, it } from "vitest";
import {
  addRelated,
  addSynonym,
  createEntry,
  isDuplicate,
  pruneEmpties,
  remove,
  removeSynonym,
  setFocus,
  updateText,
} from "../../src/components/SeoDrawer/keyphraseState";
import { MAX_KEYPHRASES } from "../../src/constants";

const seed = () => [
  createEntry("payload cms", ["payloadcms"]),
  createEntry("headless cms", []),
  createEntry("typescript cms", []),
];

describe("keyphraseState", () => {
  it("createEntry makes a unique id and copies inputs", () => {
    const a = createEntry("x", ["y"]);
    const b = createEntry("x", ["y"]);
    expect(a.id).not.toBe(b.id);
    expect(a).toMatchObject({ text: "x", synonyms: ["y"] });
  });

  it("addRelated appends a new empty entry on every call up to the cap", () => {
    let list = seed(); // 3 filled entries
    list = addRelated(list); // 4
    list = addRelated(list); // 5
    expect(list).toHaveLength(MAX_KEYPHRASES);
    list = addRelated(list); // capped at MAX_KEYPHRASES
    expect(list).toHaveLength(MAX_KEYPHRASES);
  });

  it("addRelated adds another empty even when an empty already exists", () => {
    const list = addRelated(addRelated(seed()));
    expect(list.filter((k) => k.text === "")).toHaveLength(2);
  });

  it("updateText changes only the matching entry", () => {
    // Use the seeded ids from the same list instance.
    const l = seed();
    const l2 = updateText(l, l[1].id, "new");
    expect(l2[1].text).toBe("new");
    expect(l2[0].text).toBe("payload cms");
  });

  it("addSynonym trims, dedupes case-insensitively, ignores blanks", () => {
    const l = seed();
    let l2 = addSynonym(l, l[0].id, "  Payloadcms ");
    expect(l2[0].synonyms).toEqual(["payloadcms"]); // dedupe vs existing
    l2 = addSynonym(l2, l[0].id, "");
    expect(l2[0].synonyms).toEqual(["payloadcms"]);
    l2 = addSynonym(l2, l[0].id, "payload");
    expect(l2[0].synonyms).toEqual(["payloadcms", "payload"]);
  });

  it("removeSynonym removes by index", () => {
    const l = seed();
    expect(removeSynonym(l, l[0].id, 0)[0].synonyms).toEqual([]);
  });

  it("remove leaves the focus entry untouched (it can only be emptied)", () => {
    const l = seed();
    expect(remove(l, l[0].id)).toBe(l);
  });

  it("remove drops a related entry", () => {
    const l = seed();
    const l2 = remove(l, l[1].id);
    expect(l2.map((k) => k.text)).toEqual(["payload cms", "typescript cms"]);
  });

  it("setFocus moves the entry to index 0, others keep order", () => {
    const l = seed();
    const l2 = setFocus(l, l[2].id);
    expect(l2.map((k) => k.text)).toEqual(["typescript cms", "payload cms", "headless cms"]);
  });

  it("isDuplicate is case-insensitive and ignores the entry itself and blanks", () => {
    const l = seed();
    expect(isDuplicate(l, l[1].id, "PAYLOAD CMS")).toBe(true);
    expect(isDuplicate(l, l[0].id, "payload cms")).toBe(false);
    expect(isDuplicate(l, l[1].id, "   ")).toBe(false);
  });

  it("pruneEmpties drops blank-text entries", () => {
    const l = [...seed(), createEntry("", [])];
    expect(pruneEmpties(l)).toHaveLength(3);
  });
});
