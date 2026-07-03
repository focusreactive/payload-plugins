import { describe, expect, it } from "vitest";

import { fingerprint } from "./fingerprinter";
import type { IdPath } from "./idPath";

const entry = (idPath: string, text: string) => ({ idPath: idPath as IdPath, text });

describe("fingerprint", () => {
  it("is reorder-invariant: same entries in a different order hash the same", () => {
    const a = [entry("a", "one"), entry("b", "two"), entry("c", "three")];
    const b = [entry("c", "three"), entry("a", "one"), entry("b", "two")];

    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it("changes when any content changes", () => {
    const base = [entry("a", "one"), entry("b", "two")];
    const changed = [entry("a", "one"), entry("b", "TWO")];

    expect(fingerprint(base)).not.toBe(fingerprint(changed));
  });

  it("changes when a key changes even if the text is identical", () => {
    const base = [entry("a", "same")];
    const moved = [entry("b", "same")];

    expect(fingerprint(base)).not.toBe(fingerprint(moved));
  });

  it("is deterministic across calls", () => {
    const p = [entry("a", "one"), entry("b", "two")];

    expect(fingerprint(p)).toBe(fingerprint(p));
  });

  it("produces a stable hash for the empty projection", () => {
    expect(fingerprint([])).toBe(fingerprint([]));
    expect(typeof fingerprint([])).toBe("string");
  });

  it("does not collide when text and key boundaries shift", () => {
    // "a" + "bc" vs "ab" + "c" must not serialize to the same string.
    const first = [entry("a", "bc")];
    const second = [entry("ab", "c")];

    expect(fingerprint(first)).not.toBe(fingerprint(second));
  });
});
