import type { Block } from "payload";

import { videoEmbedFields } from "./fields";

export const VideoEmbedInlineBlock: Block = {
  fields: videoEmbedFields,
  interfaceName: "VideoEmbedInline",
  labels: {
    plural: { en: "Videos", es: "Vídeos" },
    singular: { en: "Video", es: "Vídeo" },
  },
  slug: "videoEmbedInline",
};
