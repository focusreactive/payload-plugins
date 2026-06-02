import { describe, expect, it } from "vitest";
import { getPageTitle } from "../../../src/utils/page/getPageTitle";

describe("getPageTitle", () => {
  it("returns document.title in browser", () => {
    document.title = "My Page";
    expect(getPageTitle()).toBe("My Page");
  });

  it("returns empty string under SSR (no document)", () => {
    const originalDocument = globalThis.document;
    // @ts-expect-error - simulate SSR
    delete globalThis.document;
    try {
      expect(getPageTitle()).toBe("");
    } finally {
      globalThis.document = originalDocument;
    }
  });
});
