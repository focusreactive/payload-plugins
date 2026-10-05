import type { Block } from "payload";

import { videoEmbedFields } from "./fields";

export const VideoEmbedInlineBlock: Block = {
  fields: videoEmbedFields,
  interfaceName: "VideoEmbedInline",
  labels: {
    plural: "Videos",
    singular: "Video",
  },
  slug: "videoEmbedInline",
};
