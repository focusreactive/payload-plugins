import { describe, it, expect } from "vitest";

import { DEFAULT_FAILED_WINDOW_MS, resolveSettings } from "./settings.js";

describe("resolveSettings", () => {
  it("fills every setting from nothing", () => {
    expect(resolveSettings({})).toEqual({
      basePath: "/translate",
      failedWindowMs: DEFAULT_FAILED_WINDOW_MS,
      targetSelection: "single",
    });
  });

  it("normalises a base path the caller wrote loosely", () => {
    expect(resolveSettings({ basePath: "i18n/" }).basePath).toBe("/i18n");
  });

  it("keeps a window of zero instead of reading it as unset", () => {
    expect(
      resolveSettings({ failedWindowMs: 0 }).failedWindowMs,
      "zero means report no failures at all — a real choice, not an omission"
    ).toBe(0);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    "refuses %p as a failure window instead of carrying it to the query",
    (failedWindowMs) => {
      expect(() => resolveSettings({ failedWindowMs })).toThrow(/failedWindowMs/u);
    }
  );

  it("passes a chosen target-selection mode through", () => {
    expect(resolveSettings({ targetSelection: "multi" }).targetSelection).toBe("multi");
  });
});
