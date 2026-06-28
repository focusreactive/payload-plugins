import type { Block } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";

export const GlobalSectionSlotBlock: Block = {
  slug: "globalSectionSlot",
  interfaceName: "GlobalSectionSlotBlock",
  ...getBlockPreviewImage("Global Section"),
  labels: {
    plural: { en: "Global Sections", es: "Secciones Globales" },
    singular: { en: "Global Section", es: "Sección Global" },
  },
  fields: [
    {
      admin: {
        description: {
          en: "Pick a global section to embed. Editing that section updates every page using it.",
          es: "Elige una sección global para insertar. Editarla actualiza todas las páginas que la usan.",
        },
      },
      name: "reference",
      relationTo: "globalSection",
      required: true,
      type: "relationship",
    },
  ],
};
