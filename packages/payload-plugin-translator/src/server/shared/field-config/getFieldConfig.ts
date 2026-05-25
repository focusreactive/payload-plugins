import type { Field } from "payload";

import type { FieldTranslationConfig } from "./types";
import { TRANSLATE_KIT_CUSTOM_KEY } from "./types";

/**
 * Extract translation configuration from a Payload field.
 *
 * @param field - The Payload field to extract config from
 * @returns The translation configuration, or empty object if not defined
 */
export function getFieldTranslationConfig(
  field: Field
): FieldTranslationConfig {
  if (!field.custom || typeof field.custom !== "object") {
    return {};
  }

  const config = (field.custom as Record<string, unknown>)[
    TRANSLATE_KIT_CUSTOM_KEY
  ];

  if (!config || typeof config !== "object") {
    return {};
  }

  return config as FieldTranslationConfig;
}

/**
 * @deprecated Use `getFieldTranslationConfig` instead
 */
export const getTranslateKitFieldConfig = getFieldTranslationConfig;

/**
 * Check if a field should be excluded from translation.
 *
 * @param field - The Payload field to check
 * @returns true if the field has `translateKit.exclude: true`
 */
export function isFieldExcludedFromTranslation(field: Field): boolean {
  return getFieldTranslationConfig(field).exclude === true;
}
