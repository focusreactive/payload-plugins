import { describe, expect, it } from "vitest";

import { clampInternalLimit } from "../../src/core/limits.js";

describe("clampInternalLimit", () => {
  it("never raises a limit above its default, and lowers it to the minimum at most", () => {
    const search = { defaultValue: 500, minimum: 1 };
    const counts = { defaultValue: 5000, minimum: 0 };

    expect(clampInternalLimit({ ...search, value: undefined })).toBe(500);
    expect(clampInternalLimit({ ...search, value: Number.NaN })).toBe(500);
    expect(clampInternalLimit({ ...search, value: 10_000_000 })).toBe(500);
    expect(clampInternalLimit({ ...search, value: 2 })).toBe(2);
    expect(clampInternalLimit({ ...search, value: 0 })).toBe(1);
    expect(clampInternalLimit({ ...search, value: -4 })).toBe(1);
    expect(clampInternalLimit({ ...search, value: 7.9 })).toBe(7);
    expect(clampInternalLimit({ ...counts, value: 0 })).toBe(0);
    expect(clampInternalLimit({ ...counts, value: 1e9 })).toBe(5000);
  });
});
