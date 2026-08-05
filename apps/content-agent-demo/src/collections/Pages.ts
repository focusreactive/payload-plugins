import type { CollectionConfig } from "payload";

import { contentBlock } from "@/blocks/content";
import { ctaBlock } from "@/blocks/cta";
import { faqBlock } from "@/blocks/faq";
import { heroBlock } from "@/blocks/hero";

export const Pages: CollectionConfig = {
  slug: "pages",
  access: { read: () => true },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "_status", "updatedAt"],
    group: "Content",
    livePreview: {
      url: ({ data, locale }) => {
        const base = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4042";
        const code = locale?.code ?? "en";
        const slug = (data?.slug as string) ?? "";
        const previewPath = slug === "home" ? `/${code}` : `/${code}/${slug}`;
        return `${base}/next/preview?path=${encodeURIComponent(previewPath)}`;
      },
    },
  },
  versions: { drafts: true },
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "slug", type: "text", required: true, index: true },
    {
      name: "blocks",
      type: "blocks",
      blocks: [heroBlock, contentBlock, faqBlock, ctaBlock],
    },
  ],
};
