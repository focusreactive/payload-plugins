import type { Field } from "payload";

import { contentBlocks } from "@/blocks/contentBlocks";
import { GlobalSectionSlotBlock } from "@/blocks/GlobalSectionSlot/config";
import { heroBlocks } from "@/blocks/heroBlocks";
import { getSoleRelationId } from "@/dal/getSoleRelationId";
import { generateSeoFields } from "@/lib/utils/seoFields";

export function createBasePageFields({ withBlocksDefaultValue = false } = {}): Field[] {
  return [
    {
      tabs: [
        {
          fields: [
            {
              admin: { initCollapsed: true },
              blocks: heroBlocks,
              label: { en: "Hero banner", es: "Cabecera" },
              localized: true,
              maxRows: 1,
              minRows: 1,
              name: "hero",
              required: true,
              type: "blocks",
              ...(withBlocksDefaultValue && {
                defaultValue: () => [{ blockType: "hero" }],
              }),
            },
            {
              admin: { initCollapsed: true },
              blocks: [...contentBlocks, GlobalSectionSlotBlock],
              label: { en: "Sections", es: "Secciones" },
              localized: true,
              name: "blocks",
              required: true,
              type: "blocks",
              ...(withBlocksDefaultValue && {
                defaultValue: () =>
                  ["content", "testimonialsList", "faq"].map((blockType) => ({
                    blockType,
                  })),
              }),
            },
            {
              // Presentational only: header/footer keep their top-level data paths. Set once per
              // page, so they sit after the page's content.
              fields: [
                {
                  admin: { width: "50%" },
                  defaultValue: async () => getSoleRelationId("header"),
                  label: { en: "Header", es: "Cabecera" },
                  name: "header",
                  relationTo: "header",
                  type: "relationship",
                },
                {
                  admin: { width: "50%" },
                  defaultValue: async () => getSoleRelationId("footer"),
                  label: { en: "Footer", es: "Pie de página" },
                  name: "footer",
                  relationTo: "footer",
                  type: "relationship",
                },
              ],
              type: "row",
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
