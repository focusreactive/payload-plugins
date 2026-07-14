import { describe, expect, it } from "vitest";

import { getBarCount } from "./barCount";

describe("getBarCount", () => {
  it("scales the bar count with the host size", () => {
    expect(getBarCount("sm")).toBe(3);
    expect(getBarCount("md")).toBe(4);
    expect(getBarCount("lg")).toBe(5);
  });

  it("uses the minimum (2) for compact hosts regardless of size", () => {
    expect(getBarCount("sm", true)).toBe(2);
    expect(getBarCount("md", true)).toBe(2);
    expect(getBarCount("lg", true)).toBe(2);
  });
});
