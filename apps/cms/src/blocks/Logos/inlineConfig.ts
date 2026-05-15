import type { Block } from "payload";

import { logosFields } from "./fields";

export const LogosInlineBlock: Block = {
  fields: logosFields,
  interfaceName: "LogosInlineBlock",
  labels: {
    plural: { en: "Logos", es: "Logos" },
    singular: { en: "Logos", es: "Logos" },
  },
  slug: "logosInline",
};
