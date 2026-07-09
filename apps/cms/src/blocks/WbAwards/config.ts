import type { Block } from "payload";

import { wbLink } from "@/lib/fields/wbLink";

// WealthBriefing Awards. Self-contained section (its ui/ renders its own
// <section>/container), so no injectSection/SectionContainer.
// Field names mirror the ui props 1:1 so the controller maps straight through.
export const WbAwardsBlock: Block = {
  slug: "wbAwards",
  interfaceName: "WbAwardsBlock",
  labels: { plural: "WB Awards", singular: "WB Awards" },
  fields: [
    { name: "eyebrow", type: "text" },
    { name: "title", type: "text" },
    wbLink({ name: "cta", withLabel: true }),
    {
      name: "items",
      type: "array",
      fields: [
        { name: "region", type: "text" },
        { name: "title", type: "text" },
        { name: "description", type: "textarea" },
        wbLink({ withLabel: true }),
      ],
    },
  ],
};
