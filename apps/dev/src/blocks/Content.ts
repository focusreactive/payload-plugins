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
  // Relations-graph demo: a hasMany relationship inside a (localized) blocks field.
  { hasMany: true, name: "articles", relationTo: "articles", type: "relationship" },
];

export const ContentBlock: Block = withSectionVisibility({
  fields: contentFields,
  labels: { plural: "Content Sections", singular: "Content" },
  slug: "content",
});
