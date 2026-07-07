import type { Block } from "payload";

// WealthBriefing Hero. Self-contained section (its ui/ renders its own
// <section>/container/background), so no injectSection/SectionContainer.
// Field names mirror the ui props 1:1 so the controller maps straight through.
export const WbHeroBlock: Block = {
  slug: "wbHero",
  interfaceName: "WbHeroBlock",
  labels: { plural: "WB Heroes", singular: "WB Hero" },
  fields: [
    { name: "eyebrow", type: "text" },
    { name: "title", type: "text" },
    { name: "date", type: "text" },
    {
      name: "featured",
      type: "group",
      fields: [
        { name: "image", type: "upload", relationTo: "media" },
        { name: "category", type: "text" },
        { name: "brand", type: "text" },
        { name: "title", type: "text" },
        { name: "excerpt", type: "textarea" },
        { name: "cta", type: "text" },
        { name: "href", type: "text" },
      ],
    },
    {
      name: "compactCards",
      type: "array",
      fields: [
        { name: "label", type: "text" },
        { name: "status", type: "text" },
        { name: "title", type: "text" },
        { name: "text", type: "textarea" },
        { name: "cta", type: "text" },
        { name: "brand", type: "text" },
        { name: "href", type: "text" },
      ],
    },
    {
      name: "todayLinks",
      type: "array",
      fields: [
        { name: "brand", type: "text" },
        { name: "title", type: "text" },
        { name: "href", type: "text" },
      ],
    },
    { name: "showTodayStrip", type: "checkbox", defaultValue: true },
  ],
};
