import type { Block } from "payload";

// WealthBriefing Sponsors. Self-contained section (its ui/ renders its own
// <section>/container/background), so no injectSection/SectionContainer.
// Field names mirror the ui props 1:1 so the controller maps straight through.
export const WbSponsorsBlock: Block = {
  slug: "wbSponsors",
  interfaceName: "WbSponsorsBlock",
  labels: { plural: "WB Sponsors", singular: "WB Sponsors" },
  fields: [
    { name: "eyebrow", type: "text" },
    { name: "title", type: "text" },
    { name: "description", type: "textarea" },
    {
      name: "primaryCta",
      type: "group",
      fields: [
        { name: "label", type: "text" },
        { name: "href", type: "text" },
      ],
    },
    {
      name: "secondaryCta",
      type: "group",
      fields: [
        { name: "label", type: "text" },
        { name: "href", type: "text" },
      ],
    },
    // Newlines render as line breaks in the ui, so keep this a textarea.
    { name: "trustedLabel", type: "textarea" },
    { name: "partnerLogos", type: "text", hasMany: true },
    {
      name: "cards",
      type: "array",
      fields: [
        { name: "title", type: "text" },
        { name: "description", type: "textarea" },
        { name: "includes", type: "text", hasMany: true },
        { name: "cta", type: "text" },
        { name: "href", type: "text" },
      ],
    },
  ],
};
