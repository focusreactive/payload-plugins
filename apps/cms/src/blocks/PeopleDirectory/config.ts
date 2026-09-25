import type { Block } from "payload";

import { MARKET_OPTIONS } from "@/lib/fields/marketsField";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";

/**
 * A directory that reads the Person collection when the page renders, rather than cards an editor
 * types in. A new profile, or a changed office or photo, shows up here with no page edit, and the
 * office filter is built from the Office values the profiles actually carry.
 */
export const PeopleDirectoryBlock: Block = injectSection({
  slug: "peopleDirectory",
  interfaceName: "PeopleDirectoryBlock",
  ...getBlockPreviewImage("People Directory"),
  labels: {
    plural: { en: "People directories", es: "Directorios de personas" },
    singular: { en: "People directory", es: "Directorio de personas" },
  },
  fields: [
    ...sectionHeaderFields(),
    {
      type: "row",
      fields: [
        {
          name: "service",
          type: "relationship",
          relationTo: "page",
          label: { en: "Only people in this service", es: "Solo personas de este servicio" },
          admin: {
            description: {
              en: "On a service page, pick that page. Each person shows the standfirst they wrote for it.",
              es: "En una página de servicio, elige esa página.",
            },
          },
        },
        {
          name: "markets",
          type: "select",
          hasMany: true,
          options: [...MARKET_OPTIONS],
          label: { en: "Only people in these markets", es: "Solo personas de estos mercados" },
          admin: {
            description: {
              en: "On a market page, pick its markets. Leave both empty to list everyone.",
              es: "En una página de mercado, elige sus mercados.",
            },
          },
        },
      ],
    },
  ],
});
