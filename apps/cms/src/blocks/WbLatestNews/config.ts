import type { Block } from "payload";

// WealthBriefing Latest News. Self-contained section (its ui/ renders its own
// <section>/container), so no injectSection/SectionContainer. Field names
// mirror the ui props 1:1 so the controller maps straight through.
export const WbNewsBlock: Block = {
  slug: "wbNews",
  interfaceName: "WbNewsBlock",
  labels: { plural: "WB Latest News", singular: "WB Latest News" },
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
        { name: "description", type: "textarea" },
        { name: "cta", type: "text" },
        { name: "byline", type: "text" },
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
        { name: "text", type: "textarea" },
        { name: "href", type: "text" },
      ],
    },
  ],
};
