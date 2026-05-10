import { describe, expect, it } from "vitest";
import { getPagePath } from "../../../src/utils/page/getPagePath";

describe("getPagePath", () => {
  it("returns pathname when search is empty", () => {
    expect(getPagePath("/about", "")).toBe("/about");
  });

  it("appends ?search when search is non-empty", () => {
    expect(getPagePath("/blog", "tag=foo&page=2")).toBe("/blog?tag=foo&page=2");
  });

  it("returns empty string under SSR (no window)", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error - simulate SSR
    delete globalThis.window;
    try {
      expect(getPagePath("/about", "")).toBe("");
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
