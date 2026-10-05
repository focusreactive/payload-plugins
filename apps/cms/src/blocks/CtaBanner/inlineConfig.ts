import type { Block } from "payload";

import { ctaBannerFields } from "./fields";

export const CtaBannerInlineBlock: Block = {
  fields: ctaBannerFields,
  interfaceName: "CtaBannerInline",
  labels: {
    plural: "CTA Banners",
    singular: "CTA Banner",
  },
  slug: "ctaBannerInline",
};
