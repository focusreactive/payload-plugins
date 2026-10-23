import { describe, it, expect } from "vitest";
import type { Field } from "payload";

import { getFieldTranslationConfig, isFieldExcludedFromTranslation } from "./getFieldConfig.js";

describe("getFieldTranslationConfig", () => {
  it("returns empty object when field has no custom property", () => {
    const field: Field = { name: "title", type: "text" };
    expect(getFieldTranslationConfig(field)).toEqual({});
  });

  it("returns empty object when custom is not an object", () => {
    const field: Field = {
      name: "title",
      type: "text",
      custom: "string" as unknown as Record<string, unknown>,
    };
    expect(getFieldTranslationConfig(field)).toEqual({});
  });

  it("returns empty object when translateKit key is missing", () => {
    const field: Field = { name: "title", type: "text", custom: { other: true } };
    expect(getFieldTranslationConfig(field)).toEqual({});
  });

  it("returns empty object when translateKit is not an object", () => {
    const field: Field = { name: "title", type: "text", custom: { translateKit: "string" } };
    expect(getFieldTranslationConfig(field)).toEqual({});
  });

  it("returns config when translateKit is defined", () => {
    const field: Field = {
      name: "sku",
      type: "text",
      custom: { translateKit: { exclude: true } },
    };
    expect(getFieldTranslationConfig(field)).toEqual({ exclude: true });
  });

  it("returns config with exclude: false", () => {
    const field: Field = {
      name: "title",
      type: "text",
      custom: { translateKit: { exclude: false } },
    };
    expect(getFieldTranslationConfig(field)).toEqual({ exclude: false });
  });
});

describe("isFieldExcludedFromTranslation", () => {
  it("returns false when field has no custom property", () => {
    const field: Field = { name: "title", type: "text" };
    expect(isFieldExcludedFromTranslation(field)).toBe(false);
  });

  it("returns false when translateKit is not defined", () => {
    const field: Field = { name: "title", type: "text", custom: { other: true } };
    expect(isFieldExcludedFromTranslation(field)).toBe(false);
  });

  it("returns false when exclude is not defined", () => {
    const field: Field = { name: "title", type: "text", custom: { translateKit: {} } };
    expect(isFieldExcludedFromTranslation(field)).toBe(false);
  });

  it("returns false when exclude is false", () => {
    const field: Field = {
      name: "title",
      type: "text",
      custom: { translateKit: { exclude: false } },
    };
    expect(isFieldExcludedFromTranslation(field)).toBe(false);
  });

  it("returns true when exclude is true", () => {
    const field: Field = {
      name: "sku",
      type: "text",
      custom: { translateKit: { exclude: true } },
    };
    expect(isFieldExcludedFromTranslation(field)).toBe(true);
  });

  it("returns false when exclude is truthy but not true", () => {
    const field: Field = {
      name: "sku",
      type: "text",
      custom: { translateKit: { exclude: 1 } },
    };
    expect(isFieldExcludedFromTranslation(field)).toBe(false);
  });
});
