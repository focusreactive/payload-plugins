import type { Block } from "payload";

import { withSectionVisibility } from "@/lib/fields/section/withSectionVisibility";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";

export const GlobalSectionSlotBlock: Block = withSectionVisibility({
  slug: "globalSectionSlot",
  interfaceName: "GlobalSectionSlotBlock",
  ...getBlockPreviewImage("Reusable section"),
  labels: {
    plural: { en: "Reusable sections", es: "Secciones reutilizables" },
    singular: { en: "Reusable section", es: "Sección reutilizable" },
  },
  fields: [
    {
      admin: {
        description: {
          en: "Changes to a reusable section show up on every page that uses it.",
          es: "Los cambios en una sección reutilizable aparecen en todas las páginas que la usan.",
        },
      },
      label: { en: "Reusable section", es: "Sección reutilizable" },
      name: "reference",
      relationTo: "globalBlock",
      required: true,
      type: "relationship",
    },
  ],
});
