/**
 * Configuration options for field translation customization.
 * These options are set via the field's `custom` property.
 *
 * @example
 * ```ts
 * {
 *   name: 'sku',
 *   type: 'text',
 *   localized: true,
 *   custom: {
 *     translateKit: {
 *       exclude: true,
 *     },
 *   },
 * }
 * ```
 */
export interface FieldTranslationConfig {
  /**
   * When true, this field will be excluded from translation.
   * The field value will not be sent to the translation provider.
   *
   * Useful for fields that contain non-translatable content like:
   * - SKU codes
   * - Technical identifiers
   * - Numeric values that should remain unchanged
   */
  exclude?: boolean;
}

/**
 * @deprecated Use `FieldTranslationConfig` instead
 */
export type TranslateKitFieldConfig = FieldTranslationConfig;

/**
 * Key used to store TranslateKit configuration in field.custom
 */
export const TRANSLATE_KIT_CUSTOM_KEY = "translateKit" as const;
