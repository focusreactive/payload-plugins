import type { TextareaField, TextField } from "payload";

/**
 * Clearing a text field in the admin saves an empty string, and the list-view filter "exists:
 * false" only matches null, so a title someone deleted never showed up as missing. Storing blank
 * as null keeps that filter and the SEO overview's "missing" count telling the same story.
 */
export const blankAsMissing = <FieldType extends TextField | TextareaField>(
  field: FieldType
): FieldType => ({
  ...field,
  hooks: {
    ...field.hooks,
    beforeValidate: [
      ...(field.hooks?.beforeValidate ?? []),
      ({ value }) => (typeof value === "string" && value.trim() === "" ? null : value),
    ],
  },
});
