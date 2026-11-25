import type { Block } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { heroFields } from "@/lib/fields/heroFields";
import { injectSection } from "@/lib/fields/section/injectSection";

export const HeroBlock: Block = injectSection(
  {
    slug: "hero",
    interfaceName: "HeroBlock",
    ...getBlockPreviewImage("Hero"),
    labels: {
      plural: { en: "Hero banners", es: "Cabeceras" },
      singular: { en: "Hero banner", es: "Cabecera" },
    },
    fields: [...heroFields],
  },
  // The hero draws its own full-height dark shell: only the content width and side space apply.
  { unusedSectionFields: ["theme", "paddingY", "background"] }
);
