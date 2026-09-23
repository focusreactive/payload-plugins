import type { Block } from "payload";

import { link } from "@/lib/fields/link";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";
import { MARKET_OPTIONS } from "@/lib/fields/marketsField";

/**
 * A listing that reads the Insight collection when the page renders, rather than cards an editor
 * types in. An article that arrives from Passle appears here with no page edit, which is the
 * claim the insights page exists to prove.
 */
export const InsightsListBlock: Block = injectSection({
  slug: "insightsList",
  interfaceName: "InsightsListBlock",
  ...getBlockPreviewImage("Insights List"),
  labels: {
    plural: { en: "Insights lists", es: "Listas de artículos" },
    singular: { en: "Insights list", es: "Lista de artículos" },
  },
  fields: [
    ...sectionHeaderFields(),
    {
      type: "row",
      fields: [
        {
          admin: {
            width: "50%",
            description: {
              en: "How many of the newest articles to show.",
              es: "Cuántos de los artículos más recientes mostrar.",
            },
          },
          defaultValue: 6,
          label: { en: "Number of articles", es: "Número de artículos" },
          max: 24,
          min: 1,
          name: "limit",
          type: "number",
        },
        {
          admin: {
            width: "50%",
            description: {
              en: "Leave empty to show every market.",
              es: "Déjalo vacío para mostrar todos los mercados.",
            },
          },
          hasMany: true,
          label: { en: "Only these markets", es: "Solo estos mercados" },
          name: "markets",
          options: [...MARKET_OPTIONS],
          type: "select",
        },
      ],
    },
    link({
      appearances: false,
      required: false,
      overrides: {
        name: "viewAll",
        label: { en: "View all link", es: "Enlace a todos" },
      },
    }),
  ],
});
