import type { Block } from "payload";

// WealthBriefing Featured. Self-contained section (its ui/ renders its own
// <section>/container/background), so no injectSection/SectionContainer.
// Field names mirror the ui props 1:1 so the controller maps straight through.
export const WbFeaturedBlock: Block = {
  slug: "wbFeatured",
  interfaceName: "WbFeaturedBlock",
  labels: { plural: "WB Featured", singular: "WB Featured" },
  fields: [
    { name: "eyebrow", type: "text" },
    { name: "title", type: "text" },
    { name: "cta", type: "text" },
    { name: "ctaHref", type: "text" },
    {
      name: "items",
      type: "array",
      fields: [
        { name: "image", type: "upload", relationTo: "media" },
        { name: "category", type: "text" },
        { name: "brand", type: "text" },
        { name: "title", type: "text" },
        { name: "description", type: "textarea" },
        { name: "date", type: "text" },
        { name: "href", type: "text" },
      ],
    },
  ],
};
