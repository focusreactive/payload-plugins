import type { Block } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";

import { logosFields } from "./fields";

export const LogosBlock: Block = injectSection({
  slug: "logos",
  interfaceName: "LogosBlock",
  ...getBlockPreviewImage("Logos"),
  labels: {
    plural: { en: "Logos", es: "Logos" },
    singular: { en: "Logos", es: "Logos" },
  },
  fields: logosFields,
});
