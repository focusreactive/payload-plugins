import type { Block } from "payload";

import { getBlockPreviewImage } from "@/core/lib/blockPreviewImage";
import { heroFields } from "@/fields/heroFields";
import { embedSectionTab } from "@/fields/section/embedSectionTab";

export const HeroBlock: Block = {
  slug: "hero",
  interfaceName: "HeroBlock",
  ...getBlockPreviewImage("Hero"),
  labels: {
    plural: { en: "Heroes", es: "Héroes" },
    singular: { en: "Hero", es: "Hero" },
  },
  fields: embedSectionTab([...heroFields]),
};
