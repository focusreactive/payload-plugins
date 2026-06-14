import { describe, expect, it } from "vitest";

import { AVG_GLYPH_PX, getTitleProgressGuarded, TITLE_FALLBACK_MAX_PX } from "../../../src/engine/helpers/title-progress";

describe("title-progress constants", () => {
  it("AVG_GLYPH_PX equals 8.5", () => {
    expect(AVG_GLYPH_PX).toBe(8.5);
  });

  it("TITLE_FALLBACK_MAX_PX equals 600", () => {
    expect(TITLE_FALLBACK_MAX_PX).toBe(600);
  });
});

describe("getTitleProgressGuarded (Node fallback branch)", () => {
  it("short title: actual = Math.round(11 × 8.5), max = 600, score = 9", () => {
    const result = getTitleProgressGuarded("Short Title");
    expect(result.actual).toBe(94);
    expect(result.max).toBe(600);
    expect(result.score).toBe(9);
  });

  it("boundary over: 71 chars → Math.round(71 × 8.5) = 604 > 600 → score = 1", () => {
    const result = getTitleProgressGuarded("A".repeat(71));
    expect(result.actual).toBe(Math.round(71 * 8.5));
    expect(result.actual).toBeGreaterThan(600);
    expect(result.score).toBe(1);
  });

  it("boundary at: 70 chars → Math.round(70 × 8.5) = 595 ≤ 600 → score = 9", () => {
    const result = getTitleProgressGuarded("A".repeat(70));
    expect(result.actual).toBe(Math.round(70 * 8.5));
    expect(result.actual).toBeLessThanOrEqual(600);
    expect(result.score).toBe(9);
  });

  it("empty title: actual = 0, max = 600, score = 9", () => {
    const result = getTitleProgressGuarded("");
    expect(result.actual).toBe(0);
    expect(result.max).toBe(600);
    expect(result.score).toBe(9);
  });
});
