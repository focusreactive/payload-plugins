import { describe, it, expect } from "vitest";
import type { Field } from "payload";
import { DataReconciler } from "./DataReconciler";

describe("DataReconciler", () => {
  describe("deep merge with target priority", () => {
    it("uses target value when it exists", () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const sourceData = { title: "Hello" };
      const targetData = { title: "Existing" };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({ title: "Existing" });
    });

    it("uses source value when target is empty", () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const sourceData = { title: "Hello" };
      const targetData = { title: "" };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({ title: "Hello" });
    });

    it("uses source value when target is missing", () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const sourceData = { title: "Hello" };
      const targetData = {};

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({ title: "Hello" });
    });

    it("handles multiple fields independently", () => {
      const schema: Field[] = [
        { name: "title", type: "text", localized: true },
        { name: "description", type: "text", localized: true },
        { name: "slug", type: "text", localized: false },
      ];
      const sourceData = { title: "Hello", description: "World", slug: "hello" };
      const targetData = { title: "Translated Title", description: "", slug: "other-slug" };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        title: "Translated Title",
        description: "World",
        slug: "other-slug",
      });
    });

    it("preserves full document shape", () => {
      const schema: Field[] = [
        { name: "title", type: "text", localized: true },
        { name: "slug", type: "text", localized: false },
        { name: "author", type: "relationship", relationTo: "users", localized: false },
      ];
      const sourceData = { title: "Hello", slug: "hello", author: "123" };
      const targetData = {};

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        title: "Hello",
        slug: "hello",
        author: "123",
      });
    });
  });

  describe("nested structures", () => {
    it("reconciles group fields", () => {
      const schema: Field[] = [
        {
          name: "meta",
          type: "group",
          fields: [
            { name: "title", type: "text", localized: true },
            { name: "slug", type: "text", localized: false },
          ],
        },
      ];
      const sourceData = { meta: { title: "Hello", slug: "hello" } };
      const targetData = { meta: { title: "Existing", slug: "" } };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        meta: { title: "Existing", slug: "hello" },
      });
    });

    it("reconciles array fields", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [
            { name: "label", type: "text", localized: true },
            { name: "value", type: "text", localized: false },
          ],
        },
      ];
      const sourceData = {
        items: [
          { id: "1", label: "First", value: "one" },
          { id: "2", label: "Second", value: "two" },
        ],
      };
      const targetData = {
        items: [
          { id: "1", label: "Translated", value: "" },
          { id: "2", label: "", value: "y" },
        ],
      };

      const reconciler = new DataReconciler(schema);
      // Non-localized array → shared rows → id kept so Payload updates them in place.
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        items: [
          { id: "1", label: "Translated", value: "one" },
          { id: "2", label: "Second", value: "y" },
        ],
      });
    });

    it("reconciles blocks fields", () => {
      const schema: Field[] = [
        {
          name: "layout",
          type: "blocks",
          blocks: [
            {
              slug: "text",
              fields: [
                { name: "content", type: "text", localized: true },
                { name: "style", type: "text", localized: false },
              ],
            },
          ],
        },
      ];
      const sourceData = {
        layout: [{ id: "1", blockType: "text", content: "Hello", style: "bold" }],
      };
      const targetData = {
        layout: [{ id: "1", blockType: "text", content: "Existing", style: "" }],
      };

      const reconciler = new DataReconciler(schema);
      // Non-localized blocks → shared rows → id kept.
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        layout: [{ id: "1", blockType: "text", content: "Existing", style: "bold" }],
      });
    });

    it("uses source for empty target in blocks", () => {
      const schema: Field[] = [
        {
          name: "layout",
          type: "blocks",
          blocks: [
            {
              slug: "text",
              fields: [{ name: "content", type: "text", localized: true }],
            },
          ],
        },
      ];
      const sourceData = {
        layout: [{ id: "1", blockType: "text", content: "Hello" }],
      };
      const targetData = {
        layout: [{ id: "1", blockType: "text", content: "" }],
      };

      const reconciler = new DataReconciler(schema);
      // Non-localized blocks → shared rows → id kept.
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        layout: [{ id: "1", blockType: "text", content: "Hello" }],
      });
    });
  });

  describe("edge cases", () => {
    it("handles null targetData", () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const sourceData = { title: "Hello" };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, null as unknown as Record<string, unknown>)).toEqual({
        title: "Hello",
      });
    });

    it("skips undefined source values", () => {
      const schema: Field[] = [
        { name: "title", type: "text", localized: true },
        { name: "description", type: "text", localized: true },
      ];
      const sourceData = { title: "Hello" };
      const targetData = { title: "Existing", description: "Target desc" };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        title: "Existing",
      });
    });
  });

  describe("tabs support", () => {
    it("reconciles fields in named tabs", () => {
      const schema: Field[] = [
        {
          type: "tabs",
          tabs: [
            {
              name: "seo",
              fields: [
                { name: "title", type: "text", localized: true },
                { name: "description", type: "text", localized: true },
              ],
            },
          ],
        },
      ];
      const sourceData = { seo: { title: "Hello", description: "World" } };
      const targetData = { seo: { title: "Translated", description: "" } };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        seo: { title: "Translated", description: "World" },
      });
    });

    it("reconciles fields in unnamed tabs", () => {
      const schema: Field[] = [
        {
          type: "tabs",
          tabs: [
            {
              label: "Content",
              fields: [
                { name: "title", type: "text", localized: true },
                { name: "body", type: "text", localized: true },
              ],
            },
          ],
        },
      ];
      const sourceData = { title: "Hello", body: "World" };
      const targetData = { title: "Translated", body: "" };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        title: "Translated",
        body: "World",
      });
    });

    it("reconciles multiple tabs with mixed named/unnamed", () => {
      const schema: Field[] = [
        {
          type: "tabs",
          tabs: [
            {
              label: "Content",
              fields: [{ name: "title", type: "text", localized: true }],
            },
            {
              name: "seo",
              fields: [{ name: "metaTitle", type: "text", localized: true }],
            },
          ],
        },
      ];
      const sourceData = { title: "Hello", seo: { metaTitle: "SEO Title" } };
      const targetData = { title: "Translated", seo: { metaTitle: "" } };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        title: "Translated",
        seo: { metaTitle: "SEO Title" },
      });
    });
  });

  describe("row and collapsible fields", () => {
    it("reconciles fields in row", () => {
      const schema: Field[] = [
        {
          type: "row",
          fields: [
            { name: "firstName", type: "text", localized: true },
            { name: "lastName", type: "text", localized: true },
          ],
        },
      ];
      const sourceData = { firstName: "John", lastName: "Doe" };
      const targetData = { firstName: "Johann", lastName: "" };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        firstName: "Johann",
        lastName: "Doe",
      });
    });

    it("reconciles fields in collapsible", () => {
      const schema: Field[] = [
        {
          type: "collapsible",
          label: "Advanced",
          fields: [
            { name: "seoTitle", type: "text", localized: true },
            { name: "seoDescription", type: "text", localized: true },
          ],
        },
      ];
      const sourceData = { seoTitle: "Title", seoDescription: "Description" };
      const targetData = { seoTitle: "Translated", seoDescription: "" };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        seoTitle: "Translated",
        seoDescription: "Description",
      });
    });
  });

  describe("array/blocks edge cases", () => {
    it("passes non-object array items through unchanged", () => {
      const schema: Field[] = [
        { name: "items", type: "array", fields: [{ name: "text", type: "text", localized: true }] },
      ];
      const sourceData = { items: [{ text: "A" }, "raw", 42] };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, {})).toEqual({
        items: [{ text: "A" }, "raw", 42],
      });
    });

    it("falls back to source for a source element with no id-match in target", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ];
      const sourceData = {
        items: [
          { id: "1", label: "A" },
          { id: "2", label: "B" },
        ],
      };
      const targetData = { items: [{ id: "1", label: "T" }] };

      const reconciler = new DataReconciler(schema);
      // id 1 → target "T" wins; id 2 → no counterpart → source "B". Non-localized → ids kept.
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        items: [
          { id: "1", label: "T" },
          { id: "2", label: "B" },
        ],
      });
    });

    it("mirrors source when array items carry no id to match on", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ];
      const sourceData = { items: [{ label: "A" }, { label: "B" }] };
      const targetData = { items: [{ label: "T" }, { label: "U" }] };

      const reconciler = new DataReconciler(schema);
      // No ids on either side → nothing to pair → target is ignored, source fills throughout.
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        items: [{ label: "A" }, { label: "B" }],
      });
    });

    it("passes block items with an unknown blockType through unchanged (source as-is, keeps id)", () => {
      const schema: Field[] = [
        {
          name: "layout",
          type: "blocks",
          blocks: [{ slug: "text", fields: [{ name: "body", type: "text", localized: true }] }],
        },
      ];
      const sourceData = { layout: [{ id: "1", blockType: "ghost", body: "X" }] };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, {})).toEqual({
        layout: [{ id: "1", blockType: "ghost", body: "X" }],
      });
    });

    it("ignores the target when the source element id is null", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ];
      const sourceData = { items: [{ id: null, label: "A" }] };
      const targetData = { items: [{ id: null, label: "T" }] };

      const reconciler = new DataReconciler(schema);
      // id null → no usable key → no match → source fills (target ignored)
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({ items: [{ label: "A" }] });
    });

    it("pairs reordered array items by id (output keeps source order)", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ];
      const sourceData = {
        items: [
          { id: "1", label: "A" },
          { id: "2", label: "B" },
        ],
      };
      const targetData = {
        items: [
          { id: "2", label: "T2" },
          { id: "1", label: "T1" },
        ],
      };

      const reconciler = new DataReconciler(schema);
      // id 1 ↔ "T1", id 2 ↔ "T2"; output follows source order. Non-localized → ids kept.
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        items: [
          { id: "1", label: "T1" },
          { id: "2", label: "T2" },
        ],
      });
    });

    it("drops target elements with no source counterpart", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ];
      const sourceData = { items: [{ id: "1", label: "A" }] };
      const targetData = {
        items: [
          { id: "1", label: "T" },
          { id: "2", label: "Extra" },
        ],
      };

      const reconciler = new DataReconciler(schema);
      // output is driven by source → only id 1 survives, id-1 target value wins. Non-localized → id kept.
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        items: [{ id: "1", label: "T" }],
      });
    });
  });

  describe("cross-locale block identity", () => {
    // Per-locale independent blocks (reordering / diverging ids) only occur for a LOCALIZED
    // container — Payload stores an independent array per locale. So the id is stripped on output
    // (per-locale rows); these cases assert the merge/pairing logic, not id retention.
    const blocksSchema: Field[] = [
      {
        name: "layout",
        type: "blocks",
        localized: true,
        blocks: [
          { slug: "text", fields: [{ name: "content", type: "text", localized: true }] },
          { slug: "quote", fields: [{ name: "content", type: "text", localized: true }] },
        ],
      },
    ];

    it("pairs reordered blocks by id, not position (output keeps source order)", () => {
      const sourceData = {
        layout: [
          { id: "1", blockType: "text", content: "Hello" },
          { id: "2", blockType: "text", content: "World" },
        ],
      };
      // Same blocks, reordered in the target locale (independent per-locale ordering).
      const targetData = {
        layout: [
          { id: "2", blockType: "text", content: "Welt" },
          { id: "1", blockType: "text", content: "Hallo" },
        ],
      };

      const reconciler = new DataReconciler(blocksSchema);
      // id 1 ↔ "Hallo", id 2 ↔ "Welt"; positional merge would wrongly give block 1 "Welt".
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        layout: [
          { blockType: "text", content: "Hallo" },
          { blockType: "text", content: "Welt" },
        ],
      });
    });

    it("uses source when no target block shares the id (independent localized content)", () => {
      const sourceData = { layout: [{ id: "en-1", blockType: "text", content: "Hello" }] };
      const targetData = { layout: [{ id: "fr-9", blockType: "text", content: "Hallo" }] };

      const reconciler = new DataReconciler(blocksSchema);
      // Ids don't correspond → no merge → mirror source, never graft the other block's value.
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        layout: [{ blockType: "text", content: "Hello" }],
      });
    });

    it("does not merge a target block of a different type that shares an id", () => {
      const sourceData = { layout: [{ id: "1", blockType: "text", content: "Hello" }] };
      const targetData = { layout: [{ id: "1", blockType: "quote", content: "Zitat" }] };

      const reconciler = new DataReconciler(blocksSchema);
      // Same id but different blockType → not the same block → source fills.
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        layout: [{ blockType: "text", content: "Hello" }],
      });
    });
  });

  describe("malformed source", () => {
    it("drops a group field whose source value is not an object", () => {
      const schema: Field[] = [
        { name: "meta", type: "group", fields: [{ name: "title", type: "text", localized: true }] },
        { name: "keep", type: "text", localized: true },
      ];
      const sourceData = { meta: null, keep: "K" };

      const reconciler = new DataReconciler(schema);
      // non-object source for a group → the group is skipped entirely
      expect(reconciler.reconcile(sourceData, {})).toEqual({ keep: "K" });
    });
  });

  // Data-loss guard (critical): the reconciler output feeds payload.update({ locale }). For a
  // NON-localized array/blocks container the rows are SHARED across locales, so the element `id`
  // MUST survive — without it Payload can't match the shared rows on a localized update and
  // deletes + recreates them, wiping every other locale's leaf values (the source). For a
  // LOCALIZED container (or any localized ancestor) the rows are per-locale, so the id is stripped
  // (keeping it would collide with the source locale's row on insert).
  describe("id retention by shared-vs-per-locale row (data-loss guard)", () => {
    it("KEEPS id on a non-localized blocks container (shared rows)", () => {
      const schema: Field[] = [
        {
          name: "layout",
          type: "blocks",
          blocks: [{ slug: "text", fields: [{ name: "content", type: "text", localized: true }] }],
        },
      ];
      const sourceData = { layout: [{ id: "b1", blockType: "text", content: "Hello" }] };

      expect(new DataReconciler(schema).reconcile(sourceData, {})).toEqual({
        layout: [{ id: "b1", blockType: "text", content: "Hello" }],
      });
    });

    it("KEEPS id on a non-localized array container (shared rows)", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ];
      const sourceData = { items: [{ id: "a1", label: "One" }] };

      expect(new DataReconciler(schema).reconcile(sourceData, {})).toEqual({
        items: [{ id: "a1", label: "One" }],
      });
    });

    it("STRIPS id on a localized blocks container (independent per-locale rows)", () => {
      const schema: Field[] = [
        {
          name: "layout",
          type: "blocks",
          localized: true,
          blocks: [{ slug: "text", fields: [{ name: "content", type: "text", localized: true }] }],
        },
      ];
      const sourceData = { layout: [{ id: "b1", blockType: "text", content: "Hello" }] };

      expect(new DataReconciler(schema).reconcile(sourceData, {})).toEqual({
        layout: [{ blockType: "text", content: "Hello" }],
      });
    });

    it("STRIPS id on a localized array container", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          localized: true,
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ];
      const sourceData = { items: [{ id: "a1", label: "One" }] };

      expect(new DataReconciler(schema).reconcile(sourceData, {})).toEqual({
        items: [{ label: "One" }],
      });
    });

    it("STRIPS id on a non-localized array nested under a localized blocks ancestor", () => {
      const schema: Field[] = [
        {
          name: "layout",
          type: "blocks",
          localized: true,
          blocks: [
            {
              slug: "row",
              fields: [
                {
                  name: "items",
                  type: "array",
                  fields: [{ name: "label", type: "text", localized: true }],
                },
              ],
            },
          ],
        },
      ];
      const sourceData = {
        layout: [{ id: "b1", blockType: "row", items: [{ id: "a1", label: "One" }] }],
      };

      // localized ancestor → the whole subtree is per-locale → every element id stripped.
      expect(new DataReconciler(schema).reconcile(sourceData, {})).toEqual({
        layout: [{ blockType: "row", items: [{ label: "One" }] }],
      });
    });

    it("STRIPS id under a localized group ancestor", () => {
      const schema: Field[] = [
        {
          name: "panel",
          type: "group",
          localized: true,
          fields: [
            {
              name: "items",
              type: "array",
              fields: [{ name: "label", type: "text", localized: true }],
            },
          ],
        },
      ];
      const sourceData = { panel: { items: [{ id: "a1", label: "One" }] } };

      expect(new DataReconciler(schema).reconcile(sourceData, {})).toEqual({
        panel: { items: [{ label: "One" }] },
      });
    });

    it("STRIPS id under a localized named-tab ancestor", () => {
      const schema: Field[] = [
        {
          type: "tabs",
          tabs: [
            {
              name: "meta",
              localized: true,
              fields: [
                {
                  name: "items",
                  type: "array",
                  fields: [{ name: "label", type: "text", localized: true }],
                },
              ],
            },
          ],
        },
      ];
      const sourceData = { meta: { items: [{ id: "a1", label: "One" }] } };

      expect(new DataReconciler(schema).reconcile(sourceData, {})).toEqual({
        meta: { items: [{ label: "One" }] },
      });
    });

    it("KEEPS id at every level of a deeply-nested all-non-localized tree (Playground shape)", () => {
      const schema: Field[] = [
        {
          name: "layout",
          type: "blocks",
          blocks: [
            {
              slug: "deepNest",
              fields: [
                {
                  name: "nested",
                  type: "blocks",
                  blocks: [
                    {
                      slug: "inner",
                      fields: [
                        { name: "innerText", type: "text", localized: true },
                        {
                          name: "leaves",
                          type: "blocks",
                          blocks: [
                            {
                              slug: "leaf",
                              fields: [{ name: "deepText", type: "text", localized: true }],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];
      const sourceData = {
        layout: [
          {
            id: "L1",
            blockType: "deepNest",
            nested: [
              {
                id: "N1",
                blockType: "inner",
                innerText: "inner en",
                leaves: [{ id: "F1", blockType: "leaf", deepText: "deep en" }],
              },
            ],
          },
        ],
      };

      expect(new DataReconciler(schema).reconcile(sourceData, {})).toEqual({
        layout: [
          {
            id: "L1",
            blockType: "deepNest",
            nested: [
              {
                id: "N1",
                blockType: "inner",
                innerText: "inner en",
                leaves: [{ id: "F1", blockType: "leaf", deepText: "deep en" }],
              },
            ],
          },
        ],
      });
    });

    it("KEEPS id and merges on a non-localized blocks container with an existing target", () => {
      const schema: Field[] = [
        {
          name: "layout",
          type: "blocks",
          blocks: [
            {
              slug: "text",
              fields: [
                { name: "content", type: "text", localized: true },
                { name: "style", type: "text", localized: false },
              ],
            },
          ],
        },
      ];
      const sourceData = {
        layout: [{ id: "b1", blockType: "text", content: "Hello", style: "bold" }],
      };
      const targetData = {
        layout: [{ id: "b1", blockType: "text", content: "Existing", style: "" }],
      };

      // shared row: target content wins, source style fills, id kept so the row updates in place.
      expect(new DataReconciler(schema).reconcile(sourceData, targetData)).toEqual({
        layout: [{ id: "b1", blockType: "text", content: "Existing", style: "bold" }],
      });
    });

    it("STRIPS id on a passthrough (unknown blockType) element under a localized container", () => {
      // Unknown blockType → element skips the reconcile walk and passes through raw; it must still
      // obey the per-locale id rule, or it leaks the source row's id and collides on insert.
      const schema: Field[] = [
        {
          name: "layout",
          type: "blocks",
          localized: true,
          blocks: [{ slug: "text", fields: [{ name: "content", type: "text", localized: true }] }],
        },
      ];
      const sourceData = { layout: [{ id: "b1", blockType: "ghost", body: "X" }] };

      expect(new DataReconciler(schema).reconcile(sourceData, {})).toEqual({
        layout: [{ blockType: "ghost", body: "X" }],
      });
    });

    it("KEEPS id on a passthrough (unknown blockType) element in a non-localized container", () => {
      const schema: Field[] = [
        {
          name: "layout",
          type: "blocks",
          blocks: [{ slug: "text", fields: [{ name: "content", type: "text", localized: true }] }],
        },
      ];
      const sourceData = { layout: [{ id: "b1", blockType: "ghost", body: "X" }] };

      // shared row → the raw passthrough keeps its id.
      expect(new DataReconciler(schema).reconcile(sourceData, {})).toEqual({
        layout: [{ id: "b1", blockType: "ghost", body: "X" }],
      });
    });

    it("adds no id key when a non-localized element carries no id (guard against id:undefined)", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ];
      const sourceData = { items: [{ label: "One" }] };

      expect(new DataReconciler(schema).reconcile(sourceData, {})).toEqual({
        items: [{ label: "One" }],
      });
    });
  });
});
