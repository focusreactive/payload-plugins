import { describe, expect, it } from "vitest";
import { canonicalIntent } from "../../src/keyphrases/canonicalIntent";

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
});
