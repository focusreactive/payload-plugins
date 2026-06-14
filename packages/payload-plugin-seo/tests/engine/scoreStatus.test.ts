import { describe, expect, it } from "vitest";
import { scoreToStatus, statusToRing } from "../../src/engine/scoreStatus";

describe("scoreToStatus", () => {
  it("maps yoast scores to traffic-light status", () => {
    expect(scoreToStatus(9)).toBe("good");
    expect(scoreToStatus(6)).toBe("warn");
    expect(scoreToStatus(3)).toBe("bad");
    expect(scoreToStatus(0)).toBe("bad");
  });

  // Boundary cases reconciled against src/constants/yoast-identifiers.md (Task 0.4):
  // good is `> 7`, warn is `> 4 && <= 7`, bad is `<= 4` (incl. 0 and negatives).
  it("treats 7 as warn and 8 as good (band is > 7, not >= 7)", () => {
    expect(scoreToStatus(8)).toBe("good");
    expect(scoreToStatus(7)).toBe("warn");
    expect(scoreToStatus(5)).toBe("warn");
    expect(scoreToStatus(4)).toBe("bad");
    expect(scoreToStatus(-10)).toBe("bad");
  });
});

describe("statusToRing", () => {
  it("aggregates check statuses into a 0–100 ring score", () => {
    expect(statusToRing([{ status: "good" }, { status: "good" }])).toBe(100);
    expect(statusToRing([{ status: "bad" }, { status: "bad" }])).toBe(0);
    // good=1, warn=0.5, bad=0 → (1 + 0.5) / 2 = 75
    expect(statusToRing([{ status: "good" }, { status: "warn" }])).toBe(75);
  });

  it("returns 100 for an empty set", () => {
    expect(statusToRing([])).toBe(100);
  });
});
