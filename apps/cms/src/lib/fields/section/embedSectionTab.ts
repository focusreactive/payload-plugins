import type { Field } from "payload";

import { sectionFields } from "./sectionFields";

/**
 * "Content" holds what the section says; "Look and spacing" holds how it looks: the section's own
 * layout/style options (`lookFields`, e.g. image side, cards per row) above the shared colours,
 * spacing and background. Tabs are unnamed, so moving a field between them changes no data path.
 */
export function embedSectionTab(contentFields: Field[], lookFields: Field[] = []): Field[] {
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
          fields: [...lookFields, sectionFields],
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
