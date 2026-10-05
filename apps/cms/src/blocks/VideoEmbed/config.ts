import type { Block } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";

import { videoEmbedFields } from "./fields";

export const VideoEmbedBlock: Block = injectSection({
  slug: "videoEmbed",
  interfaceName: "VideoEmbedBlock",
  ...getBlockPreviewImage("Video"),
  labels: {
    plural: "Videos",
    singular: "Video",
  },
  fields: [...sectionHeaderFields(), ...videoEmbedFields],
});
