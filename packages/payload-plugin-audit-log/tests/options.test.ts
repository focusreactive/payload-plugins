import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_CHANGED_PATHS, MAX_RETENTION_DAYS } from "../src/constants";
import { normalizeOptions } from "../src/options";

describe("normalizeOptions", () => {
  it("keeps a positive integer maxChangedPaths", () => {
    expect(normalizeOptions({ maxChangedPaths: 10 }).maxChangedPaths).toBe(10);
  });

  it("uses the default maxChangedPaths when it is not set", () => {
    expect(normalizeOptions().maxChangedPaths).toBe(DEFAULT_MAX_CHANGED_PATHS);
  });

  it("rejects a maxChangedPaths that is not a positive integer", () => {
    for (const maxChangedPaths of [0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => normalizeOptions({ maxChangedPaths })).toThrow(
        /maxChangedPaths must be a positive integer/u
      );
    }
  });

  it("keeps a retention of up to MAX_RETENTION_DAYS days", () => {
    expect(normalizeOptions({ retention: { days: MAX_RETENTION_DAYS } }).retention?.days).toBe(
      MAX_RETENTION_DAYS
    );
  });

  it("rejects a retention.days whose cutoff date cannot be represented", () => {
    for (const days of [MAX_RETENTION_DAYS + 1, 100_000_000, Number.MAX_SAFE_INTEGER]) {
      expect(() => normalizeOptions({ retention: { days } })).toThrow(
        new RegExp(`retention.days must be at most ${MAX_RETENTION_DAYS}`, "u")
      );
    }
  });
});
