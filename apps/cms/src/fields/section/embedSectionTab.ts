import type { Field } from "payload";

import { sectionFields } from "./sectionFields";

export function embedSectionTab(contentFields: Field[]): Field[] {
  return [
    {
      tabs: [
        {
          label: {
            en: "Content",
            es: "Contenido",
          },
          fields: contentFields,
        },
        {
          label: {
            en: "Section",
            es: "Sección",
          },
          fields: [sectionFields],
        },
      ],
      type: "tabs",
    },
  ];
}
