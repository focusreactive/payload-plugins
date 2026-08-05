import type { Block } from "payload";

import { withSectionVisibility } from "@/lib/fields/section/withSectionVisibility";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";

export const GlobalSectionSlotBlock: Block = withSectionVisibility({
  slug: "globalSectionSlot",
  interfaceName: "GlobalSectionSlotBlock",
  ...getBlockPreviewImage("Global Block"),
  labels: {
    plural: { en: "Global Blocks", es: "Bloques Globales" },
    singular: { en: "Global Block", es: "Bloque Global" },
  },
  fields: [
    {
      admin: {
        description: {
          en: "Pick a global block to embed. Editing that block updates every page using it.",
          es: "Elige un bloque global para insertar. Editarlo actualiza todas las páginas que lo usan.",
        },
      },
      name: "reference",
      relationTo: "globalBlock",
      required: true,
      type: "relationship",
    },
  ],
});
