import type { Field } from "payload";

import { contentBlocks } from "@/blocks/contentBlocks";
import { GlobalSectionSlotBlock } from "@/blocks/GlobalSectionSlot/config";
import { getSoleRelationId } from "@/dal/getSoleRelationId";
import { generateSeoFields } from "@/lib/utils/seoFields";

export function createBasePageFields({ withBlocksDefaultValue = false } = {}): Field[] {
  return [
    {
      tabs: [
        {
          fields: [
            {
              admin: {
                description: {
                  en: "The header to display on the page",
                  es: "El header a mostrar en la página",
                },
              },
              defaultValue: async () => getSoleRelationId("header"),
              name: "header",
              relationTo: "header",
              type: "relationship",
            },
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
            {
              admin: {
                description: {
                  en: "The footer to display on the page",
                  es: "El footer a mostrar en la página",
                },
              },
              defaultValue: async () => getSoleRelationId("footer"),
              name: "footer",
              relationTo: "footer",
              type: "relationship",
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
