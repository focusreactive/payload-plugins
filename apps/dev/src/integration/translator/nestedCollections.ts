import type { Block, CollectionConfig } from "payload";

/**
 * A collection that puts a localized `richText` field under **every** container the field walker
 * classifies — group, array, blocks, a named tab, an unnamed tab, and the two "transparent" shapes
 * (`row`, `collapsible`) that carry fields without owning a data level — plus one combination three
 * containers deep.
 *
 * The shared `docs` fixture proves the walker reaches a localized `text` under each of those. It
 * carries exactly one rich-text field, at the top level, so container-granular translation — which
 * rewrites a rich-text value in place inside whatever row holds it — has never been exercised
 * anywhere but the shallowest possible position.
 *
 * Every array and block row also carries a NON-localized sibling. Those rows are shared across
 * locales: one row, per-locale leaf columns, shared columns for the rest. Rewriting a rich-text
 * leaf inside such a row is where a mistake costs another locale its content, so each spec asserts
 * the sibling survived.
 */

const partBlock: Block = {
  slug: "part",
  fields: [
    { name: "body", type: "richText", localized: true },
    { name: "partRef", type: "text" },
  ],
};

const heroBlock: Block = {
  slug: "hero",
  fields: [
    { name: "body", type: "richText", localized: true },
    { name: "anchor", type: "text" },
  ],
};

export function buildNestedCollections(): CollectionConfig[] {
  const users: CollectionConfig = { slug: "users", auth: true, fields: [] };

  const nested: CollectionConfig = {
    slug: "nested",
    admin: { useAsTitle: "summary" },
    fields: [
      { name: "body", type: "richText", localized: true },
      // The one translatable leaf type the suite never used.
      { name: "summary", type: "textarea", localized: true },
      {
        name: "meta",
        type: "group",
        fields: [{ name: "body", type: "richText", localized: true }],
      },
      {
        name: "items",
        type: "array",
        fields: [
          { name: "body", type: "richText", localized: true },
          { name: "code", type: "text" },
        ],
      },
      { name: "sections", type: "blocks", blocks: [heroBlock] },
      {
        type: "tabs",
        tabs: [
          { name: "seo", fields: [{ name: "body", type: "richText", localized: true }] },
          { label: "Loose", fields: [{ name: "looseBody", type: "richText", localized: true }] },
        ],
      },
      { type: "row", fields: [{ name: "rowBody", type: "richText", localized: true }] },
      {
        type: "collapsible",
        label: "More",
        fields: [{ name: "collapsibleBody", type: "richText", localized: true }],
      },
      {
        name: "deep",
        type: "group",
        fields: [
          {
            name: "rows",
            type: "array",
            fields: [{ name: "parts", type: "blocks", blocks: [partBlock] }],
          },
        ],
      },
    ],
  };

  return [users, nested];
}
