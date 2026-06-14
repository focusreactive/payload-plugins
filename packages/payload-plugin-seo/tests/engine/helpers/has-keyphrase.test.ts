import { describe, expect, it } from "vitest";

import { hasKeyphrase } from "../../../src/engine/helpers/has-keyphrase";

describe("hasKeyphrase", () => {
  it("is false for empty or whitespace-only keyphrases", () => {
    expect(hasKeyphrase("")).toBe(false);
    expect(hasKeyphrase("   ")).toBe(false);
    expect(hasKeyphrase("\t")).toBe(false);
    expect(hasKeyphrase("\n")).toBe(false);
  });

  it("is true for a non-empty keyphrase", () => {
    expect(hasKeyphrase("seo")).toBe(true);
  });

  it("trims surrounding whitespace before measuring", () => {
    expect(hasKeyphrase("  seo  ")).toBe(true);
  });
});
