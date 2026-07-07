import type { Block } from "payload";

// WealthBriefing People Moves. Self-contained section (its ui/ renders its own
// <section>/container), so no injectSection/SectionContainer.
// Field names mirror the ui props 1:1 so the controller maps straight through.
export const WbPeopleBlock: Block = {
  slug: "wbPeople",
  interfaceName: "WbPeopleBlock",
  labels: { plural: "WB People Moves", singular: "WB People Moves" },
  fields: [
    { name: "eyebrow", type: "text" },
    { name: "title", type: "text" },
    { name: "cta", type: "text" },
    { name: "ctaHref", type: "text" },
    {
      name: "items",
      type: "array",
      fields: [
        { name: "date", type: "text" },
        { name: "category", type: "text" },
        { name: "region", type: "text" },
        { name: "title", type: "text" },
        { name: "href", type: "text" },
      ],
    },
  ],
};
