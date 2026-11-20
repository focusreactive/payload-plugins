import type { Block } from "payload";

import { ctaBannerFields } from "./fields";

export const CtaBannerInlineBlock: Block = {
  fields: ctaBannerFields,
  interfaceName: "CtaBannerInline",
  labels: {
    plural: { en: "Call-to-action banners", es: "Banners de llamada a la acción" },
    singular: { en: "Call-to-action banner", es: "Banner de llamada a la acción" },
  },
  slug: "ctaBannerInline",
};
