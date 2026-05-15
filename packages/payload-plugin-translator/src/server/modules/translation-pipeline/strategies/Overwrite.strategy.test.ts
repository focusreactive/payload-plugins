import { describe, it, expect } from "vitest";

import { OverwriteStrategy } from "./Overwrite.strategy";

describe("OverwriteStrategy", () => {
  const strategy = new OverwriteStrategy();

  describe("shouldTranslate", () => {
    it("returns true when sourceValue is non-empty string", () => {
      expect(
        strategy.shouldTranslate({
          sourceValue: "hello",
          targetValue: undefined,
        })
      ).toBe(true);
      expect(
        strategy.shouldTranslate({
          sourceValue: "hello",
          targetValue: "existing",
        })
      ).toBe(true);
    });

    it("returns true when sourceValue is non-empty object", () => {
      expect(
        strategy.shouldTranslate({
          sourceValue: { key: "value" },
          targetValue: undefined,
        })
      ).toBe(true);
    });

    it("returns true when sourceValue is non-empty array", () => {
      expect(
        strategy.shouldTranslate({
          sourceValue: [1, 2, 3],
          targetValue: undefined,
        })
      ).toBe(true);
    });

    it("returns false when sourceValue is empty string", () => {
      expect(
        strategy.shouldTranslate({ sourceValue: "", targetValue: undefined })
      ).toBe(false);
      expect(
        strategy.shouldTranslate({
          sourceValue: "   ",
          targetValue: "existing",
        })
      ).toBe(false);
    });

    it("returns false when sourceValue is null or undefined", () => {
      expect(
        strategy.shouldTranslate({ sourceValue: null, targetValue: undefined })
      ).toBe(false);
      expect(
        strategy.shouldTranslate({
          sourceValue: undefined,
          targetValue: "existing",
        })
      ).toBe(false);
    });

    it("returns false when sourceValue is empty object", () => {
      expect(
        strategy.shouldTranslate({ sourceValue: {}, targetValue: undefined })
      ).toBe(false);
    });

    it("returns false when sourceValue is empty array", () => {
      expect(
        strategy.shouldTranslate({ sourceValue: [], targetValue: undefined })
      ).toBe(false);
    });

    it("ignores targetValue completely", () => {
      // OverwriteStrategy only cares about sourceValue
      expect(
        strategy.shouldTranslate({
          sourceValue: "hello",
          targetValue: "already translated",
        })
      ).toBe(true);
      expect(
        strategy.shouldTranslate({ sourceValue: "hello", targetValue: null })
      ).toBe(true);
    });
  });
});
