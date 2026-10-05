import type { Field } from "payload";

import { sectionFields } from "./sectionFields";

export function embedSectionTab(contentFields: Field[]): Field[] {
  return [
    {
      tabs: [
        {
          fields: contentFields,
          label: "Content",
        },
        {
          fields: [sectionFields],
          label: "Section",
        },
      ],
      type: "tabs",
    },
  ];
}
