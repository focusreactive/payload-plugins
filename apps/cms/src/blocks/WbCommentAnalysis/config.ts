import type { Block } from "payload";

// WealthBriefing Comment & Analysis. Self-contained section (its ui/ renders its
// own <section>/container), so no injectSection/SectionContainer. Field names
// mirror the ui props 1:1 so the controller maps straight through.
export const WbAnalysisBlock: Block = {
  slug: "wbAnalysis",
  interfaceName: "WbAnalysisBlock",
  labels: { plural: "WB Comment & Analysis", singular: "WB Comment & Analysis" },
  fields: [
    { name: "eyebrow", type: "text" },
    { name: "title", type: "text" },
    { name: "cta", type: "text" },
    { name: "ctaHref", type: "text" },
    {
      name: "featured",
      type: "group",
      fields: [
        { name: "image", type: "upload", relationTo: "media" },
        { name: "category", type: "text" },
        { name: "date", type: "text" },
        { name: "title", type: "text" },
        { name: "excerpt", type: "textarea" },
        { name: "cta", type: "text" },
        { name: "href", type: "text" },
      ],
    },
    {
      name: "items",
      type: "array",
      fields: [
        { name: "category", type: "text" },
        { name: "date", type: "text" },
        { name: "title", type: "text" },
        { name: "description", type: "textarea" },
        { name: "href", type: "text" },
      ],
    },
  ],
};
