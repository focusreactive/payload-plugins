import { describe, it, expect } from "vitest";
import type { Field, RichTextField, TextField } from "payload";

import { withFieldTranslation } from "./field-config";
import { TranslateFieldControlExport } from "./client/widgets/translate-field-control";

const textField = (overrides: Record<string, unknown> = {}): TextField => ({ name: "title", type: "text", ...overrides }) as unknown as TextField;
const richTextField = (overrides: Record<string, unknown> = {}): RichTextField => ({ name: "content", type: "richText", ...overrides }) as unknown as RichTextField;

// Read helpers — the config is stamped under field.custom.translateKit; the control is
// positioned by appending to field.admin.components.beforeInput (the default positioner).
const kit = (field: Field) => (field.custom as Record<string, unknown>).translateKit;
const beforeInput = (field: Field) => (field.admin as { components?: { beforeInput?: unknown[] } } | undefined)?.components?.beforeInput;
const control = (field: Field) => beforeInput(field)?.[0] as TranslateFieldControlExport | undefined;

describe("withFieldTranslation", () => {
  it("plain wrap = control: stamps an empty config and positions the control", () => {
    const result = withFieldTranslation(textField());
    expect(kit(result)).toEqual({});
    expect(beforeInput(result)).toHaveLength(1);
    expect(beforeInput(result)?.[0]).toBeInstanceOf(TranslateFieldControlExport);
  });

  it("exclude stamps { exclude: true } and adds no control", () => {
    const result = withFieldTranslation(textField(), { exclude: true });
    expect(kit(result)).toEqual({ exclude: true });
    expect(beforeInput(result)).toBeUndefined();
  });

  it("richText is an eligible control (text-bearing leaf, same as text/textarea)", () => {
    const result = withFieldTranslation(richTextField());
    expect(kit(result)).toEqual({});
    expect(control(result)).toBeInstanceOf(TranslateFieldControlExport);
  });

  it("control preserves other admin.components entries while appending beforeInput", () => {
    const existingField = { path: "existing/field" };
    const field = textField({ admin: { components: { Field: existingField } } });
    const result = withFieldTranslation(field);

    const components = (result.admin as { components?: Record<string, unknown> }).components;
    expect(components?.Field).toBe(existingField); // sibling component preserved
    expect(beforeInput(result)?.[0]).toBeInstanceOf(TranslateFieldControlExport);
  });

  it("control appends to an existing beforeInput array, preserving prior entries", () => {
    const existingComponent = { path: "existing/before-input" };
    const field = textField({ admin: { components: { beforeInput: [existingComponent] } } });
    const result = withFieldTranslation(field);

    expect(beforeInput(result)).toHaveLength(2);
    expect(beforeInput(result)?.[0]).toBe(existingComponent); // prior entry preserved, control appended after
    expect(beforeInput(result)?.[1]).toBeInstanceOf(TranslateFieldControlExport);
  });

  it("preserves existing custom keys and does not mutate the input", () => {
    const field = textField({ custom: { other: "keep" } });
    const result = withFieldTranslation(field);

    expect((result.custom as Record<string, unknown>).other).toBe("keep");
    expect(result).not.toBe(field);
    expect((field.custom as Record<string, unknown>).translateKit).toBeUndefined(); // original untouched
  });
});
