import type { Block } from "payload";

import { cardsGridFields } from "./fields";

export const CardsGridInlineBlock: Block = {
  fields: cardsGridFields,
  interfaceName: "CardsGridInlineBlock",
  labels: {
    plural: { en: "Cards", es: "Tarjetas" },
    singular: { en: "Cards", es: "Tarjetas" },
  },
  slug: "cardsGridInline",
};
