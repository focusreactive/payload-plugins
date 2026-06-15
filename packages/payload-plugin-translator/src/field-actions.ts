import type { Field } from "payload";

import type { RawPayloadComponentExport } from "./client/shared/types/PayloadComponentExport";

/**
 * Strategy for placing a per-field control into a field's admin config — the seam
 * between *what* to render (a control component) and *where* it goes (positioning).
 *
 * Today the only implementation is {@link beforeInputPositioner}, built on Payload's
 * native `admin.components.beforeInput` slot. A future field-slots plugin can supply its
 * own positioner (e.g. placing the trigger in the field label, next to the locale) by
 * implementing this same interface — the control component and the wiring in
 * `withFieldTranslation` stay untouched. This is the connector we expose later; for now
 * it lives internal, with the default below as the built-in fallback.
 *
 * @template T - The concrete field type, preserved through positioning.
 * @param field - The field to attach the control to.
 * @param control - Import-map reference to the control component.
 * @returns The field with the control positioned.
 */
export type FieldControlPositioner = <T extends Field>(field: T, control: RawPayloadComponentExport) => T;

/**
 * Default positioner: append the control to the field's `admin.components.beforeInput`,
 * rendering it just above the input. `beforeInput` is an array slot, so we append —
 * preserving any components already declared on the field.
 */
export const beforeInputPositioner: FieldControlPositioner = (field, control) => {
  const withAdmin = field as typeof field & { admin?: { components?: { beforeInput?: unknown[] } } };
  const existing = withAdmin.admin?.components?.beforeInput ?? [];

  return {
    ...field,
    admin: {
      ...withAdmin.admin,
      components: {
        ...withAdmin.admin?.components,
        beforeInput: [...existing, control],
      },
    },
  };
};
