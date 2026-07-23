import { describe, expect, it } from "vitest";

import { pruneSourceFromTarget } from "./pruneSourceFromTarget";

describe("pruneSourceFromTarget", () => {
  describe("multi (string[])", () => {
    it("removes the source locale from the selection", () => {
      expect(pruneSourceFromTarget(["en", "de", "fr"], "en")).toEqual(["de", "fr"]);
    });

    it("returns null when the source is not selected (no update needed)", () => {
      expect(pruneSourceFromTarget(["de", "fr"], "en")).toBeNull();
    });

    it("returns [] when the source was the only selected target", () => {
      expect(pruneSourceFromTarget(["en"], "en")).toEqual([]);
    });

    it("returns null for an empty selection", () => {
      expect(pruneSourceFromTarget([], "en")).toBeNull();
    });
  });

  describe("single (string)", () => {
    it("clears the value when it equals the source", () => {
      expect(pruneSourceFromTarget("en", "en")).toBe("");
    });

    it("returns null when the value differs from the source", () => {
      expect(pruneSourceFromTarget("de", "en")).toBeNull();
    });

    it("returns null for an empty value", () => {
      expect(pruneSourceFromTarget("", "en")).toBeNull();
    });
  });
});
