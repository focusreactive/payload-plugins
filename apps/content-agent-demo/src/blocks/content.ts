import type { Block } from "payload";

export const contentBlock: Block = {
  slug: "content",
  interfaceName: "ContentBlock",
  labels: { singular: "Content", plural: "Content Sections" },
  fields: [{ name: "body", type: "richText", localized: true, required: true }],
};
