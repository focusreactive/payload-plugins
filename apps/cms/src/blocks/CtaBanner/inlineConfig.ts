import type { Block } from "payload";

import { ctaBannerFields } from "./fields";

export const CtaBannerInlineBlock: Block = {
  fields: ctaBannerFields,
  interfaceName: "CtaBannerInline",
  labels: {
    plural: { en: "CTA Banners", es: "Banners CTA" },
    singular: { en: "CTA Banner", es: "Banner CTA" },
  },
  slug: "ctaBannerInline",
};
