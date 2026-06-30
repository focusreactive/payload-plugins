import type { Field } from "payload";

import { contentBlocks } from "@/blocks/contentBlocks";
import { GlobalSectionSlotBlock } from "@/blocks/GlobalSectionSlot/config";
import { generateSeoFields } from "@/lib/utils/seoFields";

export function createBasePageFields({ withBlocksDefaultValue = false } = {}): Field[] {
  return [
    {
      type: "row",
      fields: [
        {
          admin: {
            width: "50%",
            description: {
              en: "The header to display on the page",
              es: "El header a mostrar en la página",
            },
          },
          name: "header",
          relationTo: "header",
          type: "relationship",
        },
        {
          admin: {
            width: "50%",
            description: {
              en: "The footer to display on the page",
              es: "El footer a mostrar en la página",
            },
          },
          name: "footer",
          relationTo: "footer",
          type: "relationship",
        },
      ],
    },
    {
      tabs: [
        {
          fields: [
            {
              admin: {
                initCollapsed: true,
              },
              blocks: [...contentBlocks, GlobalSectionSlotBlock],
              localized: true,
              name: "blocks",
              required: true,
              type: "blocks",
              ...(withBlocksDefaultValue && {
                defaultValue: () =>
                  ["hero", "content", "testimonialsList", "faq"].map((blockType) => ({
                    blockType,
                  })),
              }),
            },
          ],
          label: { en: "Content", es: "Contenido" },
        },
        {
          fields: generateSeoFields({ generation: true }),
          label: { en: "SEO", es: "SEO" },
          localized: true,
          name: "meta",
        },
      ],
      type: "tabs",
    },
  ];
}
