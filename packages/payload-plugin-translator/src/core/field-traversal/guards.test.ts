import { describe, it, expect } from "vitest";
import type { FieldLike } from "./types";
import { hasFields, isBlockItem, isTabsField } from "./guards";

describe("field-traversal guards", () => {
  describe("isTabsField", () => {
    it("returns true for tabs field", () => {
      const field: FieldLike = {
        type: "tabs",
        tabs: [{ name: "general", fields: [] }],
      };
      expect(isTabsField(field)).toBe(true);
    });

    it("returns false for group field", () => {
      const field: FieldLike = { name: "meta", type: "group", fields: [] };
      expect(isTabsField(field)).toBe(false);
    });

    it("returns false for text field", () => {
      const field: FieldLike = { name: "title", type: "text" };
      expect(isTabsField(field)).toBe(false);
    });
  });

  describe("isBlockItem", () => {
    it("returns true for object with blockType string", () => {
      expect(isBlockItem({ blockType: "hero" })).toBe(true);
      expect(isBlockItem({ blockType: "content", title: "Hello" })).toBe(true);
    });

    it("returns false for object without blockType", () => {
      expect(isBlockItem({ title: "Hello" })).toBe(false);
      expect(isBlockItem({})).toBe(false);
    });

    it("returns false for object with non-string blockType", () => {
      expect(isBlockItem({ blockType: 123 })).toBe(false);
      expect(isBlockItem({ blockType: null })).toBe(false);
      expect(isBlockItem({ blockType: undefined })).toBe(false);
    });

    it("returns false for non-objects", () => {
      expect(isBlockItem(null)).toBe(false);
      expect(isBlockItem(undefined)).toBe(false);
      expect(isBlockItem("string")).toBe(false);
      expect(isBlockItem(123)).toBe(false);
      expect(isBlockItem([])).toBe(false);
    });
  });

  describe("hasFields", () => {
    it("returns true for object with fields array", () => {
      expect(hasFields({ fields: [] })).toBe(true);
      expect(hasFields({ fields: [{ name: "title", type: "text" }] })).toBe(true);
    });

    it("returns true for group-like objects with fields", () => {
      const groupField: FieldLike = { name: "meta", type: "group", fields: [] };
      expect(hasFields(groupField)).toBe(true);
    });

    it("returns false for object without fields", () => {
      expect(hasFields({ name: "title" })).toBe(false);
      expect(hasFields({})).toBe(false);
    });

    it("returns false for object with non-array fields", () => {
      expect(hasFields({ fields: "not-array" })).toBe(false);
      expect(hasFields({ fields: {} })).toBe(false);
      expect(hasFields({ fields: null })).toBe(false);
    });

    it("returns false for non-objects", () => {
      expect(hasFields(null)).toBe(false);
      expect(hasFields(undefined)).toBe(false);
      expect(hasFields("string")).toBe(false);
      expect(hasFields(123)).toBe(false);
    });
  });
});
