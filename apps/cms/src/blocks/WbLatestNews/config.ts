import type { Block } from "payload";

import { wbLink } from "@/lib/fields/wbLink";

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
    wbLink({ name: "cta", withLabel: true, label: { en: "CTA", es: "CTA" } }),
    {
      name: "featured",
      type: "group",
      fields: [
        { name: "image", type: "upload", relationTo: "media" },
        { name: "category", type: "text" },
        { name: "date", type: "text" },
        { name: "title", type: "text" },
        { name: "description", type: "textarea" },
        { name: "byline", type: "text" },
        wbLink({ withLabel: true }),
      ],
    },
    {
      name: "items",
      type: "array",
      admin: { initCollapsed: true },
      fields: [
        { name: "category", type: "text" },
        { name: "date", type: "text" },
        { name: "title", type: "text" },
        { name: "text", type: "textarea" },
        wbLink(),
      ],
    },
  ],
};
