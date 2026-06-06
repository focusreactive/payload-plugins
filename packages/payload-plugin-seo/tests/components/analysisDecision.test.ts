import { describe, expect, it } from "vitest";
import { decideAutoAction, hasKeyphrase } from "../../src/components/SeoDrawer/analysisDecision";

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
});

describe("decideAutoAction", () => {
  it("skips while disabled (drawer not yet opened)", () => {
    expect(decideAutoAction({ enabled: false, hasKeyphrase: true, signature: "a", lastSignature: null })).toBe("skip");
  });

  it("resets when enabled but keyphrase is empty", () => {
    expect(decideAutoAction({ enabled: true, hasKeyphrase: false, signature: "a", lastSignature: "a" })).toBe("reset");
  });

  it("skips when the current signature was already analyzed (dedup)", () => {
    expect(decideAutoAction({ enabled: true, hasKeyphrase: true, signature: "a", lastSignature: "a" })).toBe("skip");
  });

  it("runs when enabled, keyphrase present, and content is new", () => {
    expect(decideAutoAction({ enabled: true, hasKeyphrase: true, signature: "b", lastSignature: "a" })).toBe("run");
    expect(decideAutoAction({ enabled: true, hasKeyphrase: true, signature: "b", lastSignature: null })).toBe("run");
  });
});
