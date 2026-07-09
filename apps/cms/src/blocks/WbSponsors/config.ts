import type { Block } from "payload";

import { wbLink } from "@/lib/fields/wbLink";

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
    wbLink({ name: "primaryCta", withLabel: true }),
    wbLink({ name: "secondaryCta", withLabel: true }),
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
        wbLink({ withLabel: true }),
      ],
    },
  ],
};
