import type { Block } from "payload";

import { withSectionVisibility } from "@/lib/fields/section/withSectionVisibility";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";

export const GlobalSectionSlotBlock: Block = withSectionVisibility({
  slug: "globalSectionSlot",
  interfaceName: "GlobalSectionSlotBlock",
  ...getBlockPreviewImage("Global section"),
  labels: {
    plural: { en: "Global sections", es: "Secciones globales" },
    singular: { en: "Global section", es: "Sección global" },
  },
  fields: [
    {
      admin: {
        description: {
          en: "Editing the global block updates every page that uses it.",
          es: "Editar el bloque global actualiza todas las páginas que lo usan.",
        },
      },
      name: "reference",
      relationTo: "globalBlock",
      required: true,
      type: "relationship",
    },
  ],
});
