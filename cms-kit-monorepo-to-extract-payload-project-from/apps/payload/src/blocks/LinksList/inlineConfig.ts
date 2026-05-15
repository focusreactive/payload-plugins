import type { Block } from "payload";

import { linksListFields } from "./fields";

export const LinksListInlineBlock: Block = {
  fields: linksListFields,
  interfaceName: "LinksListInlineBlock",
  labels: {
    plural: { en: "Links Lists", es: "Listas de enlaces" },
    singular: { en: "Links List", es: "Lista de enlaces" },
  },
  slug: "linksListInline",
};
