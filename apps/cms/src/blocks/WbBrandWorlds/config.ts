import type { Block } from "payload";

// WealthBriefing Brand Worlds. Self-contained section (its ui/ renders its own
// <section>/container/background), so no injectSection/SectionContainer.
// Field names mirror the ui props 1:1 so the controller maps straight through.
export const WbBrandsBlock: Block = {
  slug: "wbBrands",
  interfaceName: "WbBrandsBlock",
  labels: { plural: "WB Brand Worlds", singular: "WB Brand World" },
  fields: [
    { name: "eyebrow", type: "text" },
    { name: "title", type: "text" },
    { name: "titleSecondLine", type: "text" },
    { name: "subtitle", type: "textarea" },
    {
      name: "items",
      type: "array",
      fields: [
        { name: "number", type: "text" },
        { name: "brand", type: "text" },
        { name: "description", type: "textarea" },
        { name: "includes", type: "text", hasMany: true },
        { name: "latestHighlight", type: "text" },
        { name: "latestCta", type: "text" },
        { name: "href", type: "text" },
      ],
    },
  ],
};
