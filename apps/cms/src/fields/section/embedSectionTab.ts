import type { Field } from "payload";

import { sectionFields } from "./sectionFields";

export function embedSectionTab(contentFields: Field[]): Field[] {
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
          fields: [sectionFields],
          label: {
            en: "Section",
            es: "Sección",
          },
        },
      ],
      type: "tabs",
    },
  ];
}
