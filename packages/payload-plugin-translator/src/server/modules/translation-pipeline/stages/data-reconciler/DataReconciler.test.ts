import type { Field } from "payload";
import { describe, it, expect } from "vitest";

import { DataReconciler } from "./DataReconciler";

describe("DataReconciler", () => {
  describe("deep merge with target priority", () => {
    it("uses target value when it exists", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const sourceData = { title: "Hello" };
      const targetData = { title: "Existing" };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        title: "Existing",
      });
    });

    it("uses source value when target is empty", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const sourceData = { title: "Hello" };
      const targetData = { title: "" };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        title: "Hello",
      });
    });

    it("uses source value when target is missing", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const sourceData = { title: "Hello" };
      const targetData = {};

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        title: "Hello",
      });
    });

    it("handles multiple fields independently", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        { localized: true, name: "description", type: "text" },
        { localized: false, name: "slug", type: "text" },
      ];
      const sourceData = {
        description: "World",
        slug: "hello",
        title: "Hello",
      };
      const targetData = {
        description: "",
        slug: "other-slug",
        title: "Translated Title",
      };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        description: "World",
        slug: "other-slug",
        title: "Translated Title",
      });
    });

    it("preserves full document shape", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        { localized: false, name: "slug", type: "text" },
        {
          localized: false,
          name: "author",
          relationTo: "users",
          type: "relationship",
        },
      ];
      const sourceData = { author: "123", slug: "hello", title: "Hello" };
      const targetData = {};

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        author: "123",
        slug: "hello",
        title: "Hello",
      });
    });
  });

  describe("nested structures", () => {
    it("reconciles group fields", () => {
      const schema: Field[] = [
        {
          fields: [
            { name: "title", type: "text", localized: true },
            { name: "slug", type: "text", localized: false },
          ],
          name: "meta",
          type: "group",
        },
      ];
      const sourceData = { meta: { slug: "hello", title: "Hello" } };
      const targetData = { meta: { slug: "", title: "Existing" } };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        meta: { slug: "hello", title: "Existing" },
      });
    });

    it("reconciles array fields", () => {
      const schema: Field[] = [
        {
          fields: [
            { name: "label", type: "text", localized: true },
            { name: "value", type: "text", localized: false },
          ],
          name: "items",
          type: "array",
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
      // Note: id is not included in result - Postgres rejects it on update
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        items: [
          { label: "Translated", value: "one" },
          { label: "Second", value: "y" },
        ],
      });
    });

    it("reconciles blocks fields", () => {
      const schema: Field[] = [
        {
          blocks: [
            {
              slug: "text",
              fields: [
                { name: "content", type: "text", localized: true },
                { name: "style", type: "text", localized: false },
              ],
            },
          ],
          name: "layout",
          type: "blocks",
        },
      ];
      const sourceData = {
        layout: [
          { blockType: "text", content: "Hello", id: "1", style: "bold" },
        ],
      };
      const targetData = {
        layout: [
          { blockType: "text", content: "Existing", id: "1", style: "" },
        ],
      };

      const reconciler = new DataReconciler(schema);
      // Note: id is not included in result - Postgres rejects it on update
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        layout: [{ blockType: "text", content: "Existing", style: "bold" }],
      });
    });

    it("uses source for empty target in blocks", () => {
      const schema: Field[] = [
        {
          blocks: [
            {
              slug: "text",
              fields: [{ name: "content", type: "text", localized: true }],
            },
          ],
          name: "layout",
          type: "blocks",
        },
      ];
      const sourceData = {
        layout: [{ blockType: "text", content: "Hello", id: "1" }],
      };
      const targetData = {
        layout: [{ blockType: "text", content: "", id: "1" }],
      };

      const reconciler = new DataReconciler(schema);
      // Note: id is not included in result - Postgres rejects it on update
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        layout: [{ blockType: "text", content: "Hello" }],
      });
    });
  });

  describe("edge cases", () => {
    it("handles null targetData", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const sourceData = { title: "Hello" };

      const reconciler = new DataReconciler(schema);
      expect(
        reconciler.reconcile(
          sourceData,
          null as unknown as Record<string, unknown>
        )
      ).toEqual({
        title: "Hello",
      });
    });

    it("skips undefined source values", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        { localized: true, name: "description", type: "text" },
      ];
      const sourceData = { title: "Hello" };
      const targetData = { description: "Target desc", title: "Existing" };

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
          tabs: [
            {
              name: "seo",
              fields: [
                { name: "title", type: "text", localized: true },
                { name: "description", type: "text", localized: true },
              ],
            },
          ],
          type: "tabs",
        },
      ];
      const sourceData = { seo: { description: "World", title: "Hello" } };
      const targetData = { seo: { description: "", title: "Translated" } };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        seo: { description: "World", title: "Translated" },
      });
    });

    it("reconciles fields in unnamed tabs", () => {
      const schema: Field[] = [
        {
          tabs: [
            {
              label: "Content",
              fields: [
                { name: "title", type: "text", localized: true },
                { name: "body", type: "text", localized: true },
              ],
            },
          ],
          type: "tabs",
        },
      ];
      const sourceData = { body: "World", title: "Hello" };
      const targetData = { body: "", title: "Translated" };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        body: "World",
        title: "Translated",
      });
    });

    it("reconciles multiple tabs with mixed named/unnamed", () => {
      const schema: Field[] = [
        {
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
          type: "tabs",
        },
      ];
      const sourceData = { seo: { metaTitle: "SEO Title" }, title: "Hello" };
      const targetData = { seo: { metaTitle: "" }, title: "Translated" };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        seo: { metaTitle: "SEO Title" },
        title: "Translated",
      });
    });
  });

  describe("row and collapsible fields", () => {
    it("reconciles fields in row", () => {
      const schema: Field[] = [
        {
          fields: [
            { name: "firstName", type: "text", localized: true },
            { name: "lastName", type: "text", localized: true },
          ],
          type: "row",
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
          fields: [
            { name: "seoTitle", type: "text", localized: true },
            { name: "seoDescription", type: "text", localized: true },
          ],
          label: "Advanced",
          type: "collapsible",
        },
      ];
      const sourceData = { seoDescription: "Description", seoTitle: "Title" };
      const targetData = { seoDescription: "", seoTitle: "Translated" };

      const reconciler = new DataReconciler(schema);
      expect(reconciler.reconcile(sourceData, targetData)).toEqual({
        seoDescription: "Description",
        seoTitle: "Translated",
      });
    });
  });
});
