import { definePreview } from "@focus-reactive/payload-plugin-stacked-editing";
import type { Block, Field } from "payload";
import { withSectionVisibility } from "../lib/section-visibility/withSectionVisibility";

// Not localized: Payload forbids it inside the localized `sections` field that holds this block.
const PointBlock: Block = {
  slug: "point",
  labels: { plural: "Points", singular: "Point" },
  fields: [{ name: "text", required: true, type: "text" }],
};

const featuresFields: Field[] = [
  { name: "heading", type: "text" },
  {
    name: "items",
    type: "array",
    labels: { plural: "Features", singular: "Feature" },
    admin: {
      custom: {
        preview: definePreview({ title: "title", subtitle: "points.length", media: "image" }),
      },
    },
    fields: [
      { name: "title", required: true, type: "text" },
      { name: "image", relationTo: "media", type: "upload" },
      { name: "points", type: "blocks", blocks: [PointBlock] },
    ],
  },
];

export const FeaturesBlock: Block = withSectionVisibility({
  fields: featuresFields,
  labels: { plural: "Feature Lists", singular: "Features" },
  slug: "features",
});
