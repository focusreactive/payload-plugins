import type { Block } from "payload";

import { wbLink } from "@/lib/fields/wbLink";

// WealthBriefing Research. Self-contained section (its ui/ renders its own
// <section>/container/background), so no injectSection/SectionContainer.
// Field names mirror the ui props 1:1 so the controller maps straight through.
export const WbResearchBlock: Block = {
  slug: "wbResearch",
  interfaceName: "WbResearchBlock",
  labels: { plural: "WB Research", singular: "WB Research" },
  fields: [
    { name: "eyebrow", type: "text" },
    { name: "title", type: "text" },
    wbLink({ name: "cta", withLabel: true, label: { en: "CTA", es: "CTA" } }),
    {
      name: "featured",
      type: "group",
      fields: [
        { name: "image", type: "upload", relationTo: "media" },
        { name: "pill", type: "text" },
        { name: "meta", type: "text" },
        { name: "title", type: "text" },
        { name: "excerpt", type: "textarea" },
        wbLink({ withLabel: true }),
      ],
    },
    {
      name: "items",
      type: "array",
      admin: { initCollapsed: true },
      fields: [
        { name: "date", type: "text" },
        { name: "type", type: "text" },
        { name: "title", type: "text" },
        { name: "desc", type: "textarea" },
        wbLink({ withLabel: true }),
      ],
    },
  ],
};
