import type { CollectionConfig } from "payload";

export const Posts: CollectionConfig = {
  slug: "posts",
  access: { read: () => true },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "_status", "publishedAt"],
    group: "Content",
    livePreview: {
      url: ({ data, locale }) => {
        const base = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4042";
        const code = locale?.code ?? "en";
        const previewPath = `/${code}/blog/${(data?.slug as string) ?? ""}`;
        return `${base}/next/preview?path=${encodeURIComponent(previewPath)}`;
      },
    },
  },
  versions: { drafts: true },
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "slug", type: "text", required: true, index: true },
    { name: "excerpt", type: "textarea", localized: true },
    { name: "publishedAt", type: "date" },
    { name: "heroImage", type: "upload", relationTo: "media" },
    { name: "content", type: "richText", localized: true },
    { name: "authors", type: "relationship", relationTo: "authors", hasMany: true },
    { name: "categories", type: "relationship", relationTo: "categories", hasMany: true },
  ],
};
