import type { Block } from "payload";

import { wbLink } from "@/lib/fields/wbLink";

// WealthBriefing Events. Self-contained section (its ui/ renders its own
// <section>/container), so no injectSection/SectionContainer. Field names
// mirror the ui props 1:1 so the controller maps straight through.
export const WbEventsBlock: Block = {
  slug: "wbEvents",
  interfaceName: "WbEventsBlock",
  labels: { plural: "WB Events", singular: "WB Events" },
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
        { name: "date", type: "text" },
        { name: "location", type: "text" },
        { name: "title", type: "text" },
        { name: "description", type: "textarea" },
        wbLink({ withLabel: true }),
      ],
    },
    {
      name: "events",
      type: "array",
      admin: { initCollapsed: true },
      fields: [
        { name: "type", type: "text" },
        { name: "date", type: "text" },
        { name: "location", type: "text" },
        { name: "title", type: "text" },
        { name: "description", type: "textarea" },
        wbLink({ withLabel: true }),
      ],
    },
  ],
};
