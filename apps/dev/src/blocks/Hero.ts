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
];

export const HeroBlock: Block = withSectionVisibility({
  fields: heroFields,
  labels: { plural: "Heroes", singular: "Hero" },
  slug: "hero",
});
