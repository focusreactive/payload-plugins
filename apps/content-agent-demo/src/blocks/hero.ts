import type { Block } from "payload";

export const heroBlock: Block = {
  slug: "hero",
  interfaceName: "HeroBlock",
  labels: { singular: "Hero", plural: "Heroes" },
  fields: [
    { name: "heading", type: "text", localized: true, required: true },
    { name: "subheading", type: "text", localized: true },
    { name: "image", type: "upload", relationTo: "media" },
  ],
};
