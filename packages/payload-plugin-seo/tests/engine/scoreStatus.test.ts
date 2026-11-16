import { describe, expect, it } from "vitest";
import { fleschToStatus, scoreToStatus, statusToRing } from "../../src/engine/scoreStatus";

describe("scoreToStatus", () => {
  it("maps yoast scores to traffic-light status", () => {
    expect(scoreToStatus(9)).toBe("good");
    expect(scoreToStatus(6)).toBe("warn");
    expect(scoreToStatus(3)).toBe("bad");
    expect(scoreToStatus(0)).toBe("bad");
  });

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
    expect(statusToRing([{ status: "good" }, { status: "warn" }])).toBe(75);
  });

  it("returns 100 for an empty set", () => {
    expect(statusToRing([])).toBe(100);
  });
});

describe("fleschToStatus", () => {
  it("uses the Yoast bands by default", () => {
    expect(fleschToStatus(60)).toBe("good");
    expect(fleschToStatus(55)).toBe("warn");
    expect(fleschToStatus(49)).toBe("bad");
  });

  it("uses the configured bands", () => {
    const bands = { min: 40, acceptableMin: 30 };
    expect(fleschToStatus(40, bands)).toBe("good");
    expect(fleschToStatus(35, bands)).toBe("warn");
    expect(fleschToStatus(29, bands)).toBe("bad");
  });
});
