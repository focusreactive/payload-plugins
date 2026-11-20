import type { CollectionConfig } from "payload";
import { withFieldTranslation } from "@focus-reactive/payload-plugin-translator";

// Sandbox collection for exercising the per-field translate control on a richText field
// (top-level — the control no-ops for fields inside blocks). Translate `content` from a
// saved source locale: create an article, fill `content` in e.g. `en`, save, switch locale,
// then use the field control.
export const Articles: CollectionConfig = {
  slug: "articles",
  admin: {
    useAsTitle: "title",
  },
  fields: [
    {
      name: "title",
      required: true,
      type: "text",
    },
    withFieldTranslation({
      localized: true,
      name: "content",
      type: "richText",
    }),
    // Relations below feed the relations-graph plugin's demo (graph, where-used, insights).
    { hasMany: true, name: "authors", relationTo: "authors", type: "relationship" },
    { name: "category", relationTo: "categories", type: "relationship" },
    { name: "cover", relationTo: "media", type: "upload" },
    {
      hasMany: true,
      name: "related",
      relationTo: ["articles", "pages"],
      type: "relationship",
    },
  ],
};
