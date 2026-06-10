import { describe, expect, it } from "vitest";
import { decideAutoAction } from "../../src/components/SeoDrawer/analysisDecision";

describe("decideAutoAction", () => {
  it("skips while disabled (drawer not yet opened)", () => {
    expect(decideAutoAction({ enabled: false, signature: "a", lastSignature: null })).toBe("skip");
  });

  it("skips when the current signature was already analyzed (dedup)", () => {
    expect(decideAutoAction({ enabled: true, signature: "a", lastSignature: "a" })).toBe("skip");
  });

  it("runs when enabled and content is new, regardless of keyphrase presence", () => {
    expect(decideAutoAction({ enabled: true, signature: "b", lastSignature: "a" })).toBe("run");
    expect(decideAutoAction({ enabled: true, signature: "b", lastSignature: null })).toBe("run");
  });
});
