import type { Field } from "payload";
import { describe, expect, it } from "vitest";

import { filterLocalizedFields } from "./filterLocalizedFields";

describe("filterLocalizedFields", () => {
  describe("simple fields", () => {
    it("should keep localized text field", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const data = { other: "World", title: "Hello" };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({ title: "Hello" });
    });

    it("should filter out non-localized text field", () => {
      const schema: Field[] = [{ name: "slug", type: "text" }];
      const data = { slug: "hello-world" };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({});
    });

    it("should handle mixed localized and non-localized fields", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        { name: "slug", type: "text" },
        { localized: true, name: "description", type: "textarea" },
      ];
      const data = { description: "World", slug: "hello", title: "Hello" };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({ description: "World", title: "Hello" });
    });

    it("should skip undefined values", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const data = {};

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({});
    });
  });

  describe("group fields", () => {
    it("should recursively filter group with localized nested field", () => {
      const schema: Field[] = [
        {
          fields: [
            { name: "title", type: "text", localized: true },
            { name: "canonical", type: "text" },
          ],
          name: "seo",
          type: "group",
        },
      ];
      const data = { seo: { canonical: "/page", title: "SEO Title" } };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({ seo: { title: "SEO Title" } });
    });

    it("should exclude group if no localized fields inside", () => {
      const schema: Field[] = [
        {
          fields: [{ name: "enabled", type: "checkbox" }],
          name: "settings",
          type: "group",
        },
      ];
      const data = { settings: { enabled: true } };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({});
    });
  });

  describe("array fields", () => {
    it("should recursively filter array items", () => {
      const schema: Field[] = [
        {
          fields: [
            { name: "text", type: "text", localized: true },
            { name: "order", type: "number" },
          ],
          name: "items",
          type: "array",
        },
      ];
      const data = {
        items: [
          { id: "1", order: 1, text: "First" },
          { id: "2", order: 2, text: "Second" },
        ],
      };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({
        items: [
          { id: "1", text: "First" },
          { id: "2", text: "Second" },
        ],
      });
    });

    it("should exclude array if no localized fields inside items", () => {
      const schema: Field[] = [
        {
          fields: [{ name: "name", type: "text" }],
          name: "tags",
          type: "array",
        },
      ];
      const data = { tags: [{ id: "1", name: "tag1" }] };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({});
    });
  });

  describe("blocks fields", () => {
    it("should recursively filter blocks with blockType and id preserved", () => {
      const schema: Field[] = [
        {
          blocks: [
            {
              slug: "text",
              fields: [
                { name: "body", type: "richText", localized: true },
                {
                  name: "alignment",
                  type: "select",
                  options: ["left", "center"],
                },
              ],
            },
          ],
          name: "content",
          type: "blocks",
        },
      ];
      const data = {
        content: [
          {
            alignment: "center",
            blockType: "text",
            body: { root: {} },
            id: "block1",
          },
        ],
      };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({
        content: [{ blockType: "text", body: { root: {} }, id: "block1" }],
      });
    });

    it("should handle multiple block types", () => {
      const schema: Field[] = [
        {
          blocks: [
            {
              slug: "heading",
              fields: [{ name: "title", type: "text", localized: true }],
            },
            {
              slug: "image",
              fields: [{ name: "alt", type: "text", localized: true }],
            },
          ],
          name: "content",
          type: "blocks",
        },
      ];
      const data = {
        content: [
          { blockType: "heading", id: "1", title: "Hello" },
          { alt: "Image alt", blockType: "image", id: "2" },
        ],
      };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({
        content: [
          { blockType: "heading", id: "1", title: "Hello" },
          { alt: "Image alt", blockType: "image", id: "2" },
        ],
      });
    });
  });

  describe("tabs fields", () => {
    it("should process tabs as flat fields", () => {
      const schema: Field[] = [
        {
          tabs: [
            {
              label: "Content",
              fields: [{ name: "title", type: "text", localized: true }],
            },
            {
              label: "Settings",
              fields: [{ name: "slug", type: "text" }],
            },
          ],
          type: "tabs",
        },
      ];
      const data = { slug: "hello", title: "Hello" };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({ title: "Hello" });
    });
  });

  describe("row/collapsible fields", () => {
    it("should process row fields as flat", () => {
      const schema: Field[] = [
        {
          fields: [
            { name: "firstName", type: "text", localized: true },
            { name: "lastName", type: "text", localized: true },
          ],
          type: "row",
        },
      ];
      const data = { firstName: "John", lastName: "Doe" };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({ firstName: "John", lastName: "Doe" });
    });

    it("should process collapsible fields", () => {
      const schema: Field[] = [
        {
          fields: [{ name: "meta", type: "text", localized: true }],
          label: "Advanced",
          type: "collapsible",
        },
      ];
      const data = { meta: "Some meta" };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({ meta: "Some meta" });
    });
  });

  describe("non-translatable fields", () => {
    it("should filter out localized number field", () => {
      const schema: Field[] = [
        { localized: true, name: "count", type: "number" },
      ];
      const data = { count: 42 };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({});
    });

    it("should filter out localized checkbox field", () => {
      const schema: Field[] = [
        { localized: true, name: "enabled", type: "checkbox" },
      ];
      const data = { enabled: true };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({});
    });

    it("should filter out localized select field", () => {
      const schema: Field[] = [
        {
          localized: true,
          name: "status",
          options: ["draft", "published"],
          type: "select",
        },
      ];
      const data = { status: "draft" };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({});
    });

    it("should filter out localized json field", () => {
      const schema: Field[] = [
        { localized: true, name: "metadata", type: "json" },
      ];
      const data = { metadata: { key: "value" } };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({});
    });

    it("should filter out localized code field", () => {
      const schema: Field[] = [
        { localized: true, name: "snippet", type: "code" },
      ];
      const data = { snippet: "const x = 1" };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({});
    });

    it("should filter out localized point field", () => {
      const schema: Field[] = [
        { localized: true, name: "location", type: "point" },
      ];
      const data = { location: [0, 0] };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({});
    });

    it("should filter out localized relationship field", () => {
      const schema: Field[] = [
        {
          localized: true,
          name: "author",
          relationTo: "users",
          type: "relationship",
        },
      ];
      const data = { author: "123" };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({});
    });

    it("should filter out localized upload field", () => {
      const schema: Field[] = [
        { localized: true, name: "image", relationTo: "media", type: "upload" },
      ];
      const data = { image: "456" };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({});
    });

    it("should filter out localized date field", () => {
      const schema: Field[] = [
        { localized: true, name: "publishedAt", type: "date" },
      ];
      const data = { publishedAt: "2024-01-01" };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({});
    });

    it("should filter out localized email field", () => {
      const schema: Field[] = [
        { localized: true, name: "contact", type: "email" },
      ];
      const data = { contact: "test@example.com" };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({});
    });

    it("should keep translatable fields while filtering non-translatable", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        { localized: true, name: "count", type: "number" },
        { localized: true, name: "description", type: "textarea" },
        {
          localized: true,
          name: "status",
          options: ["a", "b"],
          type: "select",
        },
        { localized: true, name: "body", type: "richText" },
      ];
      const data = {
        body: { root: {} },
        count: 42,
        description: "World",
        status: "a",
        title: "Hello",
      };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({
        body: { root: {} },
        description: "World",
        title: "Hello",
      });
    });
  });

  describe("nested structures", () => {
    it("should handle deeply nested localized fields", () => {
      const schema: Field[] = [
        {
          fields: [
            {
              name: "content",
              type: "blocks",
              blocks: [
                {
                  slug: "text",
                  fields: [
                    {
                      name: "wrapper",
                      type: "group",
                      fields: [
                        { name: "body", type: "richText", localized: true },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          name: "sections",
          type: "array",
        },
      ];
      const data = {
        sections: [
          {
            content: [
              { id: "b1", blockType: "text", wrapper: { body: { root: {} } } },
            ],
            id: "s1",
          },
        ],
      };

      const result = filterLocalizedFields(schema, data);

      expect(result).toEqual({
        sections: [
          {
            content: [
              { id: "b1", blockType: "text", wrapper: { body: { root: {} } } },
            ],
            id: "s1",
          },
        ],
      });
    });
  });
});
