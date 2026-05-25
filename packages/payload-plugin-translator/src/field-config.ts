import type { Field } from 'payload'

import type { FieldTranslationConfig } from './server/shared/field-config'
import { TRANSLATE_KIT_CUSTOM_KEY } from './server/shared/field-config'

export type { FieldTranslationConfig }

/**
 * @deprecated Use `FieldTranslationConfig` instead
 */
export type { FieldTranslationConfig as TranslateKitFieldConfig }

/**
 * Apply translation configuration to a Payload field.
 *
 * Use this helper to configure how fields should be handled during translation.
 *
 * @param field - The Payload field to configure
 * @param config - Translation configuration options
 * @returns The field with translation configuration applied
 *
 * @example
 * ```ts
 * import { withFieldTranslation } from '@focus-reactive/payload-plugin-translator'
 *
 * // Exclude a field from translation
 * withFieldTranslation(
 *   { name: 'sku', type: 'text', localized: true },
 *   { exclude: true }
 * )
 * ```
 *
 * @example
 * ```ts
 * // In a collection definition
 * const Products: CollectionConfig = {
 *   slug: 'products',
 *   fields: [
 *     { name: 'title', type: 'text', localized: true },
 *     withFieldTranslation(
 *       { name: 'sku', type: 'text', localized: true },
 *       { exclude: true }
 *     ),
 *   ],
 * }
 * ```
 */
export function withFieldTranslation<T extends Field>(field: T, config: FieldTranslationConfig): T {
  return {
    ...field,
    custom: {
      ...(field.custom ?? {}),
      [TRANSLATE_KIT_CUSTOM_KEY]: config,
    },
  }
}

/**
 * @deprecated Use `withFieldTranslation` instead
 */
export const translateKitField = withFieldTranslation
