import type { Block } from "payload";

export const ctaBlock: Block = {
  slug: "cta",
  interfaceName: "CtaBlock",
  labels: { singular: "CTA", plural: "CTAs" },
  fields: [
    { name: "heading", type: "text", localized: true, required: true },
    { name: "buttonLabel", type: "text", localized: true, required: true },
    { name: "buttonUrl", type: "text", required: true },
  ],
};
