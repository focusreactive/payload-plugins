import type { Field, GroupField } from "payload";

import { sectionFields } from "./sectionFields";

/** Shared section settings a block can leave out of its "Look and spacing" tab. */
export type SectionFieldName = "theme" | "maxWidth" | "paddingY" | "paddingX" | "background";

// Hides (not removes) the named settings, so no stored data or column changes.
const hideFields = (fields: Field[], hidden: readonly string[]): Field[] =>
  fields.map((field) => {
    if (field.type === "row") return { ...field, fields: hideFields(field.fields, hidden) };
    if ("name" in field && hidden.includes(field.name)) {
      return { ...field, admin: { ...field.admin, hidden: true } } as Field;
    }
    return field;
  });

const sectionFieldsWithout = (hidden: readonly SectionFieldName[]): GroupField =>
  hidden.length === 0
    ? sectionFields
    : { ...sectionFields, fields: hideFields(sectionFields.fields, hidden) };

/**
 * "Content" holds what the section says; "Look and spacing" holds how it looks: the section's own
 * layout/style options (`lookFields`, e.g. image side, cards per row) above the shared colours,
 * spacing and background. Tabs are unnamed, so moving a field between them changes no data path.
 */
export function embedSectionTab(
  contentFields: Field[],
  lookFields: Field[] = [],
  unusedSectionFields: readonly SectionFieldName[] = []
): Field[] {
  return [
    {
      tabs: [
        {
          fields: contentFields,
          label: {
            en: "Content",
            es: "Contenido",
          },
        },
        {
          fields: [...lookFields, sectionFieldsWithout(unusedSectionFields)],
          label: {
            en: "Look and spacing",
            es: "Aspecto y espaciado",
          },
        },
      ],
      type: "tabs",
    },
  ];
}
