import type { Field, RichTextField, TextareaField, TextField } from "payload";

import type { FieldTranslationConfig } from "./server/shared/field-config";
import { TRANSLATE_KIT_CUSTOM_KEY } from "./server/shared/field-config";
import { TranslateFieldControlExport } from "./client/widgets/translate-field-control/ui/TranslateFieldControl.export";
import type { FieldControlPositioner } from "./field-actions";
import { beforeInputPositioner } from "./field-actions";

export type { FieldTranslationConfig };

/**
 * Field types eligible for the per-field translate control — the same text-bearing
 * leaves the server's `TranslatableField` handles. `richText` writes back by re-mounting
 * the Lexical editor (see the control); `text` / `textarea` write straight to form state.
 */
type FieldControlCandidate = TextField | TextareaField | RichTextField;

/**
 * Where the translate control is placed. The single swap point: when a dedicated
 * field-slots plugin lands, point this at its positioner (or take one as config) and
 * the control moves — e.g. into the field label — without touching anything else.
 * @see FieldControlPositioner
 */
const activeFieldControlPositioner: FieldControlPositioner = beforeInputPositioner;

/**
 * @deprecated Use `FieldTranslationConfig` instead
 */
export type { FieldTranslationConfig as TranslateKitFieldConfig };

/**
 * Configure a Payload field for translation.
 *
 * - **Add a translate control** — wrap a `text` / `textarea` field with no second
 *   argument. A per-field Translate control is positioned on the field (today, just
 *   above the input). Requires `fieldLevel()` in the plugin's `levels` to register the
 *   endpoint. Control-injection behavior is `@since 0.6.0`; field exclusion predates it.
 * - **Exclude from translation** — pass `{ exclude: true }` (any field type). The field
 *   value is never sent to the translation provider and no control is added.
 *
 * @param field - The Payload field to configure
 * @param config - Pass `{ exclude: true }` to exclude; omit to add a control
 * @returns A new field with the configuration applied (the input is not mutated)
 *
 * @example
 * ```ts
 * import { withFieldTranslation } from '@focus-reactive/payload-plugin-translator'
 *
 * // Add a per-field translate control
 * withFieldTranslation({ name: 'title', type: 'text', localized: true })
 *
 * // Exclude a field from translation
 * withFieldTranslation({ name: 'sku', type: 'text', localized: true }, { exclude: true })
 * ```
 */
export function withFieldTranslation<T extends Field>(
  field: T,
  ...rest: T extends FieldControlCandidate
    ? [config?: { exclude?: boolean }]
    : [config: { exclude: true }]
): T;
export function withFieldTranslation(field: Field, config?: { exclude?: boolean }): Field {
  const configured = {
    ...field,
    custom: {
      ...(field.custom ?? {}),
      [TRANSLATE_KIT_CUSTOM_KEY]: (config ?? {}) satisfies FieldTranslationConfig,
    },
  } as Field;

  // No `exclude` = control intent: position the control via the active positioner.
  // `exclude: true` = no control (the field is left out of translation entirely).
  return config?.exclude
    ? configured
    : activeFieldControlPositioner(configured, new TranslateFieldControlExport());
}

/**
 * @deprecated Use `withFieldTranslation` instead
 */
export const translateKitField = withFieldTranslation;
