import type { Block } from "payload";

export const faqBlock: Block = {
  slug: "faq",
  interfaceName: "FaqBlock",
  labels: { singular: "FAQ", plural: "FAQs" },
  fields: [
    { name: "heading", type: "text", localized: true },
    {
      name: "items",
      type: "array",
      minRows: 1,
      admin: { initCollapsed: true },
      fields: [
        { name: "question", type: "text", localized: true, required: true },
        { name: "answer", type: "richText", localized: true, required: true },
      ],
    },
  ],
};
