import type { Field, RichTextField, TextareaField, TextField } from "payload";

import {
  isLocalizedFieldLike,
  isTranslatableFieldType,
} from "../../../core/domain/content-projection/translatableLeaf.js";

/** Translatable field types that contain text content */
export type TranslatableField = RichTextField | TextareaField | TextField;

/**
 * Type guard: Checks if a field contains translatable text content (text, textarea, richText).
 * Narrows a `{ type: string }`-shaped field to the concrete Payload {@link TranslatableField}
 * union.
 */
export function isTranslatableField(field: { type: string }): field is TranslatableField {
  return isTranslatableFieldType(field);
}

/**
 * Type guard: Checks if a field has the `localized` property set to true.
 */
export function isLocalizedField<T extends { localized?: boolean }>(
  field: T
): field is T & { localized: true } {
  return isLocalizedFieldLike(field);
}

/**
 * Type guard: Checks if a field is a relationship or upload field (should be skipped).
 */
export function isRelationshipField(field: Field): field is Field & { relationTo: unknown } {
  return "relationTo" in field && field.relationTo !== undefined;
}
