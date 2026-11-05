import { describe, expect, it } from "vitest";
import { readsWithFallbackLocale } from "../../src/utils/fallbackLocale";

describe("reads with a fallback locale", () => {
  it("is true only when another locale fills missing values", () => {
    expect(readsWithFallbackLocale({ locale: "de", fallbackLocale: "en" })).toBe(true);
    expect(readsWithFallbackLocale({ locale: "de", fallbackLocale: ["fr", "en"] })).toBe(true);
    expect(readsWithFallbackLocale({ locale: "de", fallbackLocale: false })).toBe(false);
    expect(readsWithFallbackLocale({ locale: "de", fallbackLocale: [] })).toBe(false);
    expect(readsWithFallbackLocale({ locale: "en", fallbackLocale: "en" })).toBe(false);
    expect(readsWithFallbackLocale({ locale: "all", fallbackLocale: "en" })).toBe(false);
  });
});
