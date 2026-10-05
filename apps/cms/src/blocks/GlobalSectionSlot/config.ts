import type { Block } from "payload";

import { withSectionVisibility } from "@/lib/fields/section/withSectionVisibility";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";

export const GlobalSectionSlotBlock: Block = withSectionVisibility({
  slug: "globalSectionSlot",
  interfaceName: "GlobalSectionSlotBlock",
  ...getBlockPreviewImage("Global Block"),
  labels: {
    plural: "Global Blocks",
    singular: "Global Block",
  },
  fields: [
    {
      admin: {
        description:
          "Pick a global block to embed. Editing that block updates every page using it.",
      },
      name: "reference",
      relationTo: "globalBlock",
      required: true,
      type: "relationship",
    },
  ],
});
