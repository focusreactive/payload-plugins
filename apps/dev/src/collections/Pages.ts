import type { CollectionConfig } from "payload";

import { CopyBlock } from "../blocks/Copy";
import { HeroBlock } from "../blocks/Hero";

export const Pages: CollectionConfig = {
  admin: {
    livePreview: {
      url: ({ data }) => `${process.env.NEXT_PUBLIC_SERVER_URL}/${data.slug}`,
    },
    useAsTitle: "title",
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      localized: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
    },
    {
      name: "sections",
      type: "blocks",
      blocks: [HeroBlock, CopyBlock],
      localized: true,
    },
  ],
  slug: "pages",
  versions: {
    drafts: true,
  },
};
