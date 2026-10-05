import type { Block } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { heroFields } from "@/lib/fields/heroFields";
import { injectSection } from "@/lib/fields/section/injectSection";

export const HeroBlock: Block = injectSection({
  slug: "hero",
  interfaceName: "HeroBlock",
  ...getBlockPreviewImage("Hero"),
  labels: {
    plural: "Heroes",
    singular: "Hero",
  },
  fields: [...heroFields],
});
