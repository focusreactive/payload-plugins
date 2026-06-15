import type { CollectionConfig } from "payload";
import { withFieldTranslation } from "@focus-reactive/payload-plugin-translator";

import { DeepNestBlock } from "../blocks/DeepNest";

// Sandbox collection for stress-testing field-level translation against deeply nested layouts.
// The top-level `layout` blocks field is intentionally NOT localized (the leaves inside DeepNest
// are) — see blocks/DeepNest.ts for the rationale. Create a doc, fill the fields in `en`, save,
// switch locale, then use the per-field translate control at any depth.
export const Playground: CollectionConfig = {
  slug: "playground",
  admin: {
    useAsTitle: "title",
  },
  fields: [
    withFieldTranslation({
      localized: true,
      name: "title",
      required: true,
      type: "text",
    }),
    {
      blocks: [DeepNestBlock],
      name: "layout",
      type: "blocks",
    },
  ],
};
