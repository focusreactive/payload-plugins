import type { Block } from "payload";

import { wbLink } from "@/lib/fields/wbLink";

// WealthBriefing "More Stories" / "Most Read" section. Self-contained
// (its ui/ renders its own <section>/container), so no injectSection/
// SectionContainer. Field names mirror the ui props 1:1 so the controller
// maps straight through.
export const WbMoreReadBlock: Block = {
  slug: "wbMoreRead",
  interfaceName: "WbMoreReadBlock",
  labels: { plural: "WB More Read", singular: "WB More Read" },
  fields: [
    { name: "storiesHeading", type: "text" },
    {
      name: "stories",
      type: "array",
      fields: [{ name: "category", type: "text" }, { name: "title", type: "text" }, wbLink()],
    },
    { name: "mostReadHeading", type: "text" },
    {
      name: "mostRead",
      type: "array",
      fields: [
        { name: "rank", type: "text" },
        { name: "category", type: "text" },
        { name: "title", type: "text" },
        wbLink(),
      ],
    },
  ],
};
