import type { Block } from "payload";

import { logosFields } from "./fields";

export const LogosInlineBlock: Block = {
  fields: logosFields,
  interfaceName: "LogosInlineBlock",
  labels: {
    plural: "Logos",
    singular: "Logos",
  },
  slug: "logosInline",
};
