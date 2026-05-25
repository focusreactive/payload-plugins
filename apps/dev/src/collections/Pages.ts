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
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    {
      name: "slug",
      required: true,
      type: "text",
      unique: true,
    },
    {
      blocks: [HeroBlock, CopyBlock],
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
