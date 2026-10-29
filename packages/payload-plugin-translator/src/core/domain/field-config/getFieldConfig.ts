import type { FieldTranslationConfig } from "./types.js";
import { TRANSLATE_KIT_CUSTOM_KEY } from "./types.js";

/**
 * Extract translation configuration from a Payload field.
 *
 * @param field - The field to extract config from (only its `custom` extension point is read)
 * @returns The translation configuration, or empty object if not defined
 */
export function getFieldTranslationConfig(field: {
  custom?: Record<string, unknown>;
}): FieldTranslationConfig {
  if (!field.custom || typeof field.custom !== "object") {
    return {};
  }

  const config = (field.custom as Record<string, unknown>)[TRANSLATE_KIT_CUSTOM_KEY];

  if (!config || typeof config !== "object") {
    return {};
  }

  return config as FieldTranslationConfig;
}

/**
 * Check if a field should be excluded from translation.
 *
 * @returns true when the field sets `custom.translateKit.exclude: true`
 */
export function isFieldExcludedFromTranslation(field: {
  custom?: Record<string, unknown>;
}): boolean {
  return getFieldTranslationConfig(field).exclude === true;
}
