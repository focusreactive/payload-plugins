import type { Block, Field } from "payload";
import { withSectionVisibility } from "../lib/section-visibility/withSectionVisibility";

const copyFields: Field[] = [
  {
    localized: true,
    name: "text",
    required: true,
    type: "textarea",
  },
];

export const CopyBlock: Block = withSectionVisibility({
  fields: copyFields,
  labels: { plural: "Copy Sections", singular: "Copy" },
  slug: "copy",
});
