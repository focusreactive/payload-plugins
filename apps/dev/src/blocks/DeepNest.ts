import type { Block, Field } from "payload";
import { withFieldTranslation } from "@focus-reactive/payload-plugin-translator";

// A deliberately over-nested block for exercising the per-field translate control through
// EVERY container kind the field-traversal engine has to classify:
//   - presentational (no data segment): row, collapsible, unnamed tab
//   - named (adds a path segment): group, named tab, array (indexed)
//   - polymorphic blocks, nested three deep (layout → nested → leaves)
//
// Localization model: only the leaf text/textarea/richText fields are `localized` — the
// containers are NOT. So the block structure is shared across locales (same rows/types), while
// each leaf carries an independent per-locale value. That's the setup the from-locale field
// control wants: switch to e.g. `fr`, the structure is already there, and translating-from-`en`
// pulls the saved `en` leaf value at that path. (A localized container here would collide with
// Payload's "no localized field inside a localized field" rule.)

// Deepest level — a block inside a block inside a block (layout → nested → leaves).
const LeafBlock: Block = {
  slug: "leaf",
  labels: { plural: "Leaves", singular: "Leaf" },
  fields: [
    withFieldTranslation({ localized: true, name: "deepText", type: "text" }),
    // richText three blocks deep — the hardest data-aware resolution case.
    withFieldTranslation({ localized: true, name: "deepRich", type: "richText" }),
  ],
};

// Middle block (layout → nested). Carries its own nested `blocks` field to reach LeafBlock.
const InnerBlock: Block = {
  slug: "inner",
  labels: { plural: "Inner Blocks", singular: "Inner" },
  fields: [
    withFieldTranslation({ localized: true, name: "innerText", type: "text" }),
    withFieldTranslation({ localized: true, name: "innerNote", type: "textarea" }),
    withFieldTranslation({ localized: true, name: "innerRich", type: "richText" }),
    {
      blocks: [LeafBlock],
      name: "leaves",
      type: "blocks",
    },
  ],
};

const deepNestFields: Field[] = [
  // Named group → contributes `panel.` to the path.
  {
    name: "panel",
    type: "group",
    fields: [
      // Presentational collapsible → transparent (no path segment).
      {
        type: "collapsible",
        label: "Panel body",
        fields: [
          // Presentational row → transparent. Two leaves sit at `panel.*`.
          {
            type: "row",
            fields: [
              withFieldTranslation({ localized: true, name: "heading", type: "text" }),
              withFieldTranslation({ localized: true, name: "subheading", type: "textarea" }),
            ],
          },
          withFieldTranslation({ localized: true, name: "intro", type: "richText" }),
        ],
      },
    ],
  },
  // Tabs: a named tab (adds `meta.`) and an unnamed tab (transparent).
  {
    type: "tabs",
    tabs: [
      {
        name: "meta",
        label: "Meta",
        fields: [
          withFieldTranslation({ localized: true, name: "seoTitle", type: "text" }),
          withFieldTranslation({ localized: true, name: "seoDescription", type: "textarea" }),
        ],
      },
      {
        label: "Body",
        fields: [withFieldTranslation({ localized: true, name: "body", type: "richText" })],
      },
    ],
  },
  // Array (named, indexed). A transparent collapsible inside a row exercises
  // transparent-within-indexed resolution (path stays `items.N.richBody`).
  {
    name: "items",
    type: "array",
    labels: { plural: "Items", singular: "Item" },
    fields: [
      withFieldTranslation({ localized: true, name: "label", type: "text" }),
      {
        type: "collapsible",
        label: "Item body",
        fields: [withFieldTranslation({ localized: true, name: "richBody", type: "richText" })],
      },
    ],
  },
  // Nested blocks (block-in-block) — reaches InnerBlock and, through it, LeafBlock.
  {
    blocks: [InnerBlock],
    name: "nested",
    type: "blocks",
  },
];

export const DeepNestBlock: Block = {
  slug: "deepNest",
  labels: { plural: "Deep Nests", singular: "Deep Nest" },
  fields: deepNestFields,
};
