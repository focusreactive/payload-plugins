import type { Field, RichTextField, TextareaField, TextField } from "payload";

import type { FieldLike, TabsFieldLike } from "../field-traversal/types";
import { isObject } from "../utils";

/** Translatable field types that contain text content */
export type TranslatableField = RichTextField | TextareaField | TextField;

/**
 * Type guard: Checks if a field contains translatable text content (text, textarea, richText).
 * Accepts a structural {@link FieldLike} so it can be used inside the framework-agnostic walker
 * callbacks; narrows to the concrete Payload {@link TranslatableField} union.
 */
export function isTranslatableField(field: { type: string }): field is TranslatableField {
  return field.type === "text" || field.type === "textarea" || field.type === "richText";
}

/**
 * Type guard: Checks if a field has the `localized` property set to true.
 */
export function isLocalizedField<T extends { localized?: boolean }>(
  field: T
): field is T & { localized: true } {
  return "localized" in field && field.localized === true;
}

/**
 * Type guard: Checks if a field is a relationship or upload field (should be skipped).
 */
export function isRelationshipField(field: Field): field is Field & { relationTo: unknown } {
  return "relationTo" in field && field.relationTo !== undefined;
}

/**
 * Type guard: Checks if a field is a tabs field.
 */
export function isTabsField(field: FieldLike): field is TabsFieldLike {
  return field.type === "tabs";
}

/**
 * Type guard: Checks if value is a block item (has blockType property).
 */
export function isBlockItem(
  value: unknown
): value is Record<string, unknown> & { blockType: string } {
  return isObject(value) && "blockType" in value && typeof value.blockType === "string";
}

/**
 * Type guard: Checks if value has a fields array property.
 * Works with any field/tab-like object; narrows to the framework-agnostic {@link FieldLike}
 * so the field-traversal kernel that consumes it stays free of Payload types.
 */
export function hasFields(value: unknown): value is { fields: FieldLike[] } {
  return isObject(value) && "fields" in value && Array.isArray(value.fields);
}
