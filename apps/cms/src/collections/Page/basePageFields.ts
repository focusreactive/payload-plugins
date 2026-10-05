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
                description: "The header to display on the page",
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
                  ["hero", "content", "faq"].map((blockType) => ({
                    blockType,
                  })),
              }),
            },
            {
              admin: {
                description: "The footer to display on the page",
              },
              defaultValue: async () => getSoleRelationId("footer"),
              name: "footer",
              relationTo: "footer",
              type: "relationship",
            },
          ],
          label: "Content",
        },
        {
          fields: generateSeoFields({ generation: true }),
          label: "SEO",
          localized: true,
          name: "meta",
        },
      ],
      type: "tabs",
    },
  ];
}
