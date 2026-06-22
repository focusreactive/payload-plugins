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
    plural: { en: "Cards Grids", es: "Cuadrículas de Tarjetas" },
    singular: { en: "Cards Grid", es: "Cuadrícula de Tarjetas" },
  },
  fields: [...sectionHeaderFields(), ...cardsGridFields],
});
