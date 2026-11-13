import { describe, expect, it } from "vitest";

import { slugDiffersFromStored } from "../../src/hooks/mcpStructureGuard.js";

const stored = { de: "firma", en: "company" };

describe("slugDiffersFromStored", () => {
  it("compares a plain string with the request's locale", () => {
    expect(slugDiffersFromStored("company", stored, "en", "en")).toBe(false);
    expect(slugDiffersFromStored("team", stored, "en", "en")).toBe(true);
    expect(slugDiffersFromStored("firma", stored, "de", "en")).toBe(false);
    expect(slugDiffersFromStored("company", stored, "de", "en")).toBe(true);
  });

  it("takes the default locale's slug as the stored one for a locale without its own", () => {
    expect(slugDiffersFromStored("company", { en: "company" }, "de", "en")).toBe(false);
    expect(slugDiffersFromStored("team", { en: "company" }, "de", "en")).toBe(true);
  });

  it("treats an empty value and a missing one as the same", () => {
    expect(slugDiffersFromStored("", { en: "" }, "en", "en")).toBe(false);
    expect(slugDiffersFromStored(null, {}, "en", "en")).toBe(false);
  });

  it("compares a locale all object per locale and leaves out locales untouched", () => {
    expect(slugDiffersFromStored({ de: "firma", en: "company" }, stored, "all", "en")).toBe(false);
    expect(slugDiffersFromStored({ en: "company" }, stored, "all", "en")).toBe(false);
    expect(slugDiffersFromStored({ de: "neu", en: "company" }, stored, "all", "en")).toBe(true);
  });

  it("reads a locale all slug that is not an object as a change", () => {
    expect(slugDiffersFromStored("company", stored, "all", "en")).toBe(true);
    expect(slugDiffersFromStored(null, stored, "all", "en")).toBe(true);
  });
});
