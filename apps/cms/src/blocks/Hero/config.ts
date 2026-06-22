import type { Block } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { heroFields } from "@/fields/heroFields";
import { injectSection } from "@/fields/section/injectSection";

export const HeroBlock: Block = injectSection({
  slug: "hero",
  interfaceName: "HeroBlock",
  ...getBlockPreviewImage("Hero"),
  labels: {
    plural: { en: "Heroes", es: "Héroes" },
    singular: { en: "Hero", es: "Hero" },
  },
  fields: [...heroFields],
});
