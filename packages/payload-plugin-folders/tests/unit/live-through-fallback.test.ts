import { describe, expect, it } from "vitest";

import { isLiveOnlyThroughFallback } from "../../src/core/pageRecords.js";

describe("isLiveOnlyThroughFallback", () => {
  it("is true for a locale with no status of its own while the default locale is published", () => {
    expect(isLiveOnlyThroughFallback({ en: "published" }, "de", true, "en")).toBe(true);
    expect(isLiveOnlyThroughFallback({ de: null, en: "published" }, "de", true, "en")).toBe(true);
  });

  it("is false when the locale has a status of its own, published or draft", () => {
    expect(isLiveOnlyThroughFallback({ de: "published", en: "published" }, "de", true, "en")).toBe(
      false
    );
    expect(isLiveOnlyThroughFallback({ de: "draft", en: "published" }, "de", true, "en")).toBe(
      false
    );
  });

  it("is false for the default locale, a draft default, a plain status and no fallback", () => {
    expect(isLiveOnlyThroughFallback({ en: "published" }, "en", true, "en")).toBe(false);
    expect(isLiveOnlyThroughFallback({ en: "draft" }, "de", true, "en")).toBe(false);
    expect(isLiveOnlyThroughFallback("published", "de", true, "en")).toBe(false);
    expect(isLiveOnlyThroughFallback({ en: "published" }, "de", true, null)).toBe(false);
    expect(isLiveOnlyThroughFallback({ en: "published" }, "de", false, "en")).toBe(false);
  });
});
