import type { Block } from "payload";

import { wbLink } from "@/lib/fields/wbLink";

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
        wbLink({ withLabel: true }),
      ],
    },
    {
      name: "compactCards",
      type: "array",
      admin: { initCollapsed: true },
      fields: [
        { name: "label", type: "text" },
        { name: "status", type: "text" },
        { name: "title", type: "text" },
        { name: "text", type: "textarea" },
        { name: "brand", type: "text" },
        wbLink({ withLabel: true }),
      ],
    },
    {
      name: "todayLinks",
      type: "array",
      admin: { initCollapsed: true },
      fields: [{ name: "brand", type: "text" }, { name: "title", type: "text" }, wbLink()],
    },
    { name: "showTodayStrip", type: "checkbox", defaultValue: true },
  ],
};
