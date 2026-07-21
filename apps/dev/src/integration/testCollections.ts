import type { Block, CollectionConfig } from "payload";

/**
 * Test collections for the translator integration suite. `docs` deliberately exercises EVERY nesting
 * container the translation pipeline must walk — a localized leaf under a group, an array, both block
 * types, and a named + an unnamed tab — plus a non-localized field that must stay untouched and a
 * localized richText field (the shape the c0a49d1b reconciler bug lived in). Drafts are enabled so the
 * auto-translate publish-gate is testable.
 */

const heroBlock: Block = {
  slug: "hero",
  fields: [{ name: "heading", type: "text", localized: true }],
};

const ctaBlock: Block = {
  slug: "cta",
  fields: [{ name: "caption", type: "text", localized: true }],
};

export function buildTestCollections(): CollectionConfig[] {
  const users: CollectionConfig = {
    slug: "users",
    auth: true,
    fields: [],
  };

  const docs: CollectionConfig = {
    slug: "docs",
    versions: { drafts: true },
    admin: { useAsTitle: "title" },
    fields: [
      { name: "title", type: "text", localized: true },
      { name: "ref", type: "text" }, // NOT localized — must be untouched by translation
      {
        name: "meta",
        type: "group",
        fields: [
          { name: "subtitle", type: "text", localized: true },
          { name: "sku", type: "text" }, // non-localized nested — untouched
        ],
      },
      {
        name: "items",
        type: "array",
        fields: [{ name: "label", type: "text", localized: true }],
      },
      {
        name: "sections",
        type: "blocks",
        blocks: [heroBlock, ctaBlock],
      },
      {
        type: "tabs",
        tabs: [
          { name: "seo", fields: [{ name: "seoTitle", type: "text", localized: true }] },
          { label: "Loose", fields: [{ name: "note", type: "text", localized: true }] },
        ],
      },
      { name: "body", type: "richText", localized: true },
    ],
  };

  return [users, docs];
}
