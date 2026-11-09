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
                description: {
                  en: "The page's main heading (H1). Every page has exactly one hero.",
                  es: "El encabezado principal de la página (H1). Cada página tiene exactamente un hero.",
                },
                initCollapsed: true,
              },
              blocks: heroBlocks,
              label: { en: "Hero", es: "Hero" },
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
              admin: {
                description: {
                  en: "Page sections below the hero. Section titles render as H2.",
                  es: "Secciones de la página debajo del hero. Los títulos de sección se muestran como H2.",
                },
                initCollapsed: true,
              },
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
