import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "media",
  access: { read: () => true },
  admin: { useAsTitle: "filename" },
  upload: {
    staticDir: "media",
    imageSizes: [
      { name: "thumbnail", width: 400, height: 300, position: "centre" },
      { name: "card", width: 900, height: 600, position: "centre" },
    ],
  },
  fields: [{ name: "alt", type: "text", localized: true }],
};
