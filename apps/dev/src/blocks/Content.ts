import type { Block, Field } from "payload";
import { withSectionVisibility } from "../lib/section-visibility/withSectionVisibility";

const contentFields: Field[] = [
  {
    localized: true,
    name: "content",
    required: true,
    type: "richText",
  },
  {
    name: "image",
    relationTo: "media",
    type: "upload",
  },
];

export const ContentBlock: Block = withSectionVisibility({
  fields: contentFields,
  labels: { plural: "Content Sections", singular: "Content" },
  slug: "content",
});
