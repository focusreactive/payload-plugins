import type { Block, Field } from "payload";
import { withSectionVisibility } from "../lib/section-visibility/withSectionVisibility";

const heroFields: Field[] = [
  {
    localized: true,
    name: "title",
    required: true,
    type: "text",
  },
  {
    localized: true,
    name: "description",
    type: "textarea",
  },
  {
    name: "image",
    relationTo: "media",
    type: "upload",
  },
  {
    fields: [
      {
        localized: true,
        name: "label",
        required: true,
        type: "text",
      },
      {
        name: "url",
        required: true,
        type: "text",
      },
    ],
    labels: { plural: "CTAs", singular: "CTA" },
    localized: true,
    name: "cta",
    type: "array",
  },
];

export const HeroBlock: Block = withSectionVisibility({
  fields: heroFields,
  labels: { plural: "Heroes", singular: "Hero" },
  slug: "hero",
});
