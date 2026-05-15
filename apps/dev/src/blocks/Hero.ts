import type { Block, Field } from "payload";

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

export const HeroBlock: Block = {
  fields: heroFields,
  labels: { plural: "Heroes", singular: "Hero" },
  slug: "hero",
};
