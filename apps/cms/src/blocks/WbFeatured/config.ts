import type { Block } from "payload";

import { wbLink } from "@/lib/fields/wbLink";

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
    wbLink({ name: "cta", withLabel: true, label: { en: "CTA", es: "CTA" } }),
    {
      name: "items",
      type: "array",
      admin: { initCollapsed: true },
      fields: [
        { name: "image", type: "upload", relationTo: "media" },
        { name: "category", type: "text" },
        { name: "brand", type: "text" },
        { name: "title", type: "text" },
        { name: "description", type: "textarea" },
        { name: "date", type: "text" },
        wbLink(),
      ],
    },
  ],
};
