import type { Block } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeadingField } from "@/lib/fields/sectionHeadingField";

import { cardsGridFields } from "./fields";

export const CardsGridBlock: Block = injectSection({
  slug: "cardsGrid",
  interfaceName: "CardsGridBlock",
  ...getBlockPreviewImage("Cards Grid"),
  labels: {
    plural: { en: "Cards", es: "Tarjetas" },
    singular: { en: "Cards", es: "Tarjetas" },
  },
  fields: [sectionHeadingField(), ...cardsGridFields],
});
