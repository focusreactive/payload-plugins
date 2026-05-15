import type { Block } from "payload";

import { cardsGridFields } from "./fields";

export const CardsGridInlineBlock: Block = {
  fields: cardsGridFields,
  interfaceName: "CardsGridInlineBlock",
  labels: {
    plural: { en: "Cards Grids", es: "Cuadrículas de Tarjetas" },
    singular: { en: "Cards Grid", es: "Cuadrícula de Tarjetas" },
  },
  slug: "cardsGridInline",
};
