// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  loadKeyphrases,
  saveKeyphrases,
  storageKey,
} from "../../src/components/SeoDrawer/keyphraseStorage";
import { createEntry } from "../../src/components/SeoDrawer/keyphraseState";

beforeEach(() => localStorage.clear());

describe("keyphraseStorage", () => {
  it("builds a per collection/doc/locale key", () => {
    expect(storageKey("pages", "64f", "en")).toBe("seo-kw:pages:64f:en");
  });

  it("round-trips only non-empty entries, dropping synonyms position stability aside", () => {
    const key = storageKey("pages", "1", "en");
    saveKeyphrases(key, [
      createEntry("payload cms", ["payloadcms"]),
      createEntry("", []),
      createEntry("headless cms", []),
    ]);
    const loaded = loadKeyphrases(key);
    expect(loaded.map((k) => k.text)).toEqual(["payload cms", "headless cms"]);
    expect(loaded[0].synonyms).toEqual(["payloadcms"]);
    expect(loaded[0].id).toBeTruthy();
  });

  it("removes the key when nothing persistable remains", () => {
    const key = storageKey("pages", "1", "en");
    saveKeyphrases(key, [createEntry("x", [])]);
    saveKeyphrases(key, [createEntry("", [])]);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("returns a single empty focus entry when absent or corrupt", () => {
    const key = storageKey("pages", "missing", "en");
    expect(loadKeyphrases(key)).toHaveLength(1);
    expect(loadKeyphrases(key)[0].text).toBe("");
    localStorage.setItem(key, "{not json");
    expect(loadKeyphrases(key)).toHaveLength(1);
  });
});
