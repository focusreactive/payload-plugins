import type { Block } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";

import { cardsGridFields } from "./fields";

export const CardsGridBlock: Block = injectSection({
  slug: "cardsGrid",
  interfaceName: "CardsGridBlock",
  ...getBlockPreviewImage("Cards Grid"),
  labels: {
    plural: "Cards Grids",
    singular: "Cards Grid",
  },
  fields: [...sectionHeaderFields(), ...cardsGridFields],
});
