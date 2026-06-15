import type { CollectionConfig } from "payload";
import { withFieldTranslation } from "@focus-reactive/payload-plugin-translator";

import { ContentBlock } from "../blocks/Content";
import { HeroBlock } from "../blocks/Hero";

export const Pages: CollectionConfig = {
  admin: {
    livePreview: {
      url: ({ data }) => `${process.env.NEXT_PUBLIC_SERVER_URL}/${data.slug}`,
    },
    useAsTitle: "title",
  },
  fields: [
    withFieldTranslation({
      localized: true,
      name: "title",
      required: true,
      type: "text",
    }),
    {
      name: "slug",
      required: true,
      type: "text",
      unique: true,
    },
    { name: "seoTitle", type: "text", localized: true },
    { name: "metaDescription", type: "textarea", localized: true },
    {
      blocks: [HeroBlock, ContentBlock],
      localized: true,
      name: "sections",
      type: "blocks",
    },
  ],
  slug: "pages",
  versions: {
    drafts: true,
  },
};
