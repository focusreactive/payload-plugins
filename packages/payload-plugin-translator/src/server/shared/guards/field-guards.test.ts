import { describe, it, expect } from "vitest";
import type { Field } from "payload";
import { isTranslatableField, isLocalizedField, isRelationshipField } from "./field-guards";

describe("field-guards", () => {
  describe("isTranslatableField", () => {
    it("returns true for text field", () => {
      const field: Field = { name: "title", type: "text" };
      expect(isTranslatableField(field)).toBe(true);
    });

    it("returns true for textarea field", () => {
      const field: Field = { name: "description", type: "textarea" };
      expect(isTranslatableField(field)).toBe(true);
    });

    it("returns true for richText field", () => {
      const field: Field = { name: "content", type: "richText" };
      expect(isTranslatableField(field)).toBe(true);
    });

    it("returns false for select field", () => {
      const field: Field = { name: "status", type: "select", options: ["draft", "published"] };
      expect(isTranslatableField(field)).toBe(false);
    });

    it("returns false for number field", () => {
      const field: Field = { name: "price", type: "number" };
      expect(isTranslatableField(field)).toBe(false);
    });

    it("returns false for checkbox field", () => {
      const field: Field = { name: "active", type: "checkbox" };
      expect(isTranslatableField(field)).toBe(false);
    });

    it("returns false for date field", () => {
      const field: Field = { name: "createdAt", type: "date" };
      expect(isTranslatableField(field)).toBe(false);
    });

    it("returns false for email field", () => {
      const field: Field = { name: "email", type: "email" };
      expect(isTranslatableField(field)).toBe(false);
    });

    it("returns false for relationship field", () => {
      const field: Field = { name: "author", type: "relationship", relationTo: "users" };
      expect(isTranslatableField(field)).toBe(false);
    });

    it("returns false for upload field", () => {
      const field: Field = { name: "image", type: "upload", relationTo: "media" };
      expect(isTranslatableField(field)).toBe(false);
    });

    it("returns false for array field", () => {
      const field: Field = { name: "items", type: "array", fields: [] };
      expect(isTranslatableField(field)).toBe(false);
    });

    it("returns false for group field", () => {
      const field: Field = { name: "meta", type: "group", fields: [] };
      expect(isTranslatableField(field)).toBe(false);
    });

    it("returns false for blocks field", () => {
      const field: Field = { name: "layout", type: "blocks", blocks: [] };
      expect(isTranslatableField(field)).toBe(false);
    });
  });

  describe("isLocalizedField", () => {
    it("returns true for field with localized: true", () => {
      const field: Field = { name: "title", type: "text", localized: true };
      expect(isLocalizedField(field)).toBe(true);
    });

    it("returns false for field with localized: false", () => {
      const field: Field = { name: "title", type: "text", localized: false };
      expect(isLocalizedField(field)).toBe(false);
    });

    it("returns false for field without localized property", () => {
      const field: Field = { name: "title", type: "text" };
      expect(isLocalizedField(field)).toBe(false);
    });

    it("works with different field types", () => {
      const textField: Field = { name: "title", type: "text", localized: true };
      const numberField: Field = { name: "price", type: "number", localized: true };
      const selectField: Field = { name: "status", type: "select", options: [], localized: true };

      expect(isLocalizedField(textField)).toBe(true);
      expect(isLocalizedField(numberField)).toBe(true);
      expect(isLocalizedField(selectField)).toBe(true);
    });
  });

  describe("isRelationshipField", () => {
    it("returns true for relationship field", () => {
      const field: Field = { name: "author", type: "relationship", relationTo: "users" };
      expect(isRelationshipField(field)).toBe(true);
    });

    it("returns true for upload field (has relationTo)", () => {
      const field: Field = { name: "image", type: "upload", relationTo: "media" };
      expect(isRelationshipField(field)).toBe(true);
    });

    it("returns true for relationship with multiple collections", () => {
      const field: Field = { name: "ref", type: "relationship", relationTo: ["users", "posts"] };
      expect(isRelationshipField(field)).toBe(true);
    });

    it("returns false for text field", () => {
      const field: Field = { name: "title", type: "text" };
      expect(isRelationshipField(field)).toBe(false);
    });

    it("returns false for array field", () => {
      const field: Field = { name: "items", type: "array", fields: [] };
      expect(isRelationshipField(field)).toBe(false);
    });
  });
});
