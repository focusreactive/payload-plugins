import type { Block } from "payload";

import { CARD_ICONS } from "@/blocks/CardsGrid/icons";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";

/**
 * Untitled UI's features-simple-icons-04: the heading holds the left third, and short items with
 * an icon fill a two-column grid beside it. For a set of statements that each need a title and a
 * sentence, where a bulleted list reads as fine print.
 */
export const FeatureListBlock: Block = injectSection({
  slug: "featureList",
  interfaceName: "FeatureListBlock",
  ...getBlockPreviewImage("Feature List"),
  labels: {
    plural: { en: "Feature lists", es: "Listas de características" },
    singular: { en: "Feature list", es: "Lista de características" },
  },
  fields: [
    ...sectionHeaderFields(),
    {
      name: "items",
      type: "array",
      minRows: 1,
      maxRows: 9,
      required: true,
      localized: true,
      labels: {
        singular: { en: "Item", es: "Elemento" },
        plural: { en: "Items", es: "Elementos" },
      },
      admin: { initCollapsed: true },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "icon",
              type: "select",
              admin: { width: "30%" },
              label: { en: "Icon", es: "Icono" },
              options: CARD_ICONS.map((icon) => ({ label: icon, value: icon })),
            },
            {
              name: "title",
              type: "text",
              required: true,
              admin: { width: "70%" },
              label: { en: "Title", es: "Título" },
            },
          ],
        },
        {
          name: "description",
          type: "textarea",
          label: { en: "Description", es: "Descripción" },
        },
      ],
    },
  ],
});
