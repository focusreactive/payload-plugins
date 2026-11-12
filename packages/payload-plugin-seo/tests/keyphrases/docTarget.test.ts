import { describe, expect, it } from "vitest";
import { readDocId } from "../../src/keyphrases/docTarget";

describe("readDocId", () => {
  it("reads string and finite numeric ids", () => {
    expect(readDocId(" 7 ")).toBe("7");
    expect(readDocId(42)).toBe("42");
  });

  it("rejects blank, non-finite and non-scalar values", () => {
    expect(readDocId("  ")).toBeNull();
    expect(readDocId(Number.NaN)).toBeNull();
    expect(readDocId({ id: 1 })).toBeNull();
    expect(readDocId(null)).toBeNull();
  });
});
