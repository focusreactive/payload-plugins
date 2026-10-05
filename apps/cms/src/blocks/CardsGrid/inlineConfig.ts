import type { Block } from "payload";

import { cardsGridFields } from "./fields";

export const CardsGridInlineBlock: Block = {
  fields: cardsGridFields,
  interfaceName: "CardsGridInlineBlock",
  labels: {
    plural: "Cards Grids",
    singular: "Cards Grid",
  },
  slug: "cardsGridInline",
};
