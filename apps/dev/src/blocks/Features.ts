import type { Block, Field } from "payload";
import { withSectionVisibility } from "../lib/section-visibility/withSectionVisibility";

// A page-builder block three levels deep (sections → features → items[n] → points[n]), so the
// stacked-editing plugin has a blocks → array → blocks chain to open next to Live Preview. Nothing
// is `localized` here: the `sections` field that holds this block already is.
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
    fields: [
      { name: "title", required: true, type: "text" },
      { name: "points", type: "blocks", blocks: [PointBlock] },
    ],
  },
];

export const FeaturesBlock: Block = withSectionVisibility({
  fields: featuresFields,
  labels: { plural: "Feature Lists", singular: "Features" },
  slug: "features",
});
