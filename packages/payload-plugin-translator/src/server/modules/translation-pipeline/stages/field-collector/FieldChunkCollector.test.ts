import type { Field } from "payload";
import { describe, it, expect } from "vitest";

import { OverwriteStrategy } from "../../strategies/Overwrite.strategy";
import { SkipExistingStrategy } from "../../strategies/SkipExisting.strategy";
import { FieldChunkCollector } from "./FieldChunkCollector";

const strategy = new OverwriteStrategy();
const skipExistingStrategy = new SkipExistingStrategy();

describe("FieldChunkCollector", () => {
  describe("simple fields", () => {
    it("collects localized text fields", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const data = { title: "Hello" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
      expect(chunks[0].path).toEqual(["title"]);
      expect(chunks[0].dataRef).toBe(data);
      expect(chunks[0].schema.type).toBe("text");
    });

    it("collects multiple localized fields", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        { localized: true, name: "description", type: "textarea" },
      ];
      const data = { description: "World", title: "Hello" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(2);
      expect(chunks.map((c) => c.key)).toEqual(["title", "description"]);
    });

    it("skips non-localized fields", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        { localized: false, name: "slug", type: "text" },
      ];
      const data = { slug: "hello", title: "Hello" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
    });

    it("skips non-translatable fields", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        {
          localized: true,
          name: "author",
          relationTo: "users",
          type: "relationship",
        },
      ];
      const data = { author: "123", title: "Hello" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
    });

    it("skips null and undefined values", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        { localized: true, name: "subtitle", type: "text" },
      ];
      const data = { subtitle: undefined, title: null };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(0);
    });
  });

  describe("group fields", () => {
    it("collects nested fields with correct path", () => {
      const schema: Field[] = [
        {
          fields: [{ name: "title", type: "text", localized: true }],
          name: "meta",
          type: "group",
        },
      ];
      const data = { meta: { title: "Hello" } };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
      expect(chunks[0].path).toEqual(["meta", "title"]);
      expect(chunks[0].dataRef).toBe(data.meta);
    });

    it("collects deeply nested fields", () => {
      const schema: Field[] = [
        {
          fields: [
            {
              name: "level2",
              type: "group",
              fields: [{ name: "title", type: "text", localized: true }],
            },
          ],
          name: "level1",
          type: "group",
        },
      ];
      const data = { level1: { level2: { title: "Deep" } } };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].path).toEqual(["level1", "level2", "title"]);
      expect(chunks[0].dataRef).toBe(data.level1.level2);
    });
  });

  describe("array fields", () => {
    it("collects fields from each array item", () => {
      const schema: Field[] = [
        {
          fields: [{ name: "label", type: "text", localized: true }],
          name: "items",
          type: "array",
        },
      ];
      const data = {
        items: [
          { id: "1", label: "First" },
          { id: "2", label: "Second" },
        ],
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(2);
      expect(chunks[0].path).toEqual(["items", "0", "label"]);
      expect(chunks[1].path).toEqual(["items", "1", "label"]);
      expect(chunks[0].dataRef).toBe(data.items[0]);
      expect(chunks[1].dataRef).toBe(data.items[1]);
    });

    it("uses numeric index in path", () => {
      const schema: Field[] = [
        {
          fields: [{ name: "text", type: "text", localized: true }],
          name: "items",
          type: "array",
        },
      ];
      const data = { items: [{ id: "1", text: "Hello" }] };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks[0].path).toEqual(["items", "0", "text"]);
    });
  });

  describe("blocks fields", () => {
    it("collects fields from blocks with correct path", () => {
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
      const data = {
        layout: [{ blockType: "text", content: "Hello", id: "1" }],
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].path).toEqual(["layout", "0", "content"]);
      expect(chunks[0].dataRef).toBe(data.layout[0]);
    });

    it("handles multiple block types", () => {
      const schema: Field[] = [
        {
          blocks: [
            {
              slug: "text",
              fields: [{ name: "content", type: "text", localized: true }],
            },
            {
              slug: "heading",
              fields: [{ name: "title", type: "text", localized: true }],
            },
          ],
          name: "layout",
          type: "blocks",
        },
      ];
      const data = {
        layout: [
          { blockType: "text", content: "Hello", id: "1" },
          { blockType: "heading", id: "2", title: "Title" },
        ],
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(2);
      expect(chunks[0].key).toBe("content");
      expect(chunks[1].key).toBe("title");
    });

    it("skips unknown block types", () => {
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
      const data = {
        layout: [{ blockType: "unknown", content: "Hello", id: "1" }],
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(0);
    });
  });

  describe("tabs and row fields", () => {
    it("collects fields from tabs", () => {
      const schema: Field[] = [
        {
          tabs: [
            {
              label: "Content",
              fields: [{ name: "title", type: "text", localized: true }],
            },
          ],
          type: "tabs",
        },
      ];
      const data = { title: "Hello" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].path).toEqual(["title"]);
    });

    it("collects fields from row", () => {
      const schema: Field[] = [
        {
          fields: [{ name: "title", type: "text", localized: true }],
          type: "row",
        },
      ];
      const data = { title: "Hello" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].path).toEqual(["title"]);
    });

    it("collects fields from unnamed group (no name property)", () => {
      const schema: Field[] = [
        {
          fields: [
            { name: "title", type: "text", localized: true },
            { name: "description", type: "textarea", localized: true },
          ],
          type: "group",
        } as Field, // Cast needed because group without name is valid but not in strict types
      ];
      const data = { description: "World", title: "Hello" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(2);
      expect(chunks[0].path).toEqual(["title"]);
      expect(chunks[1].path).toEqual(["description"]);
      expect(chunks[0].dataRef).toBe(data);
    });
  });

  describe("complex nested structures", () => {
    it("collects array fields inside group", () => {
      const schema: Field[] = [
        {
          fields: [
            {
              name: "items",
              type: "array",
              fields: [{ name: "label", type: "text", localized: true }],
            },
          ],
          name: "section",
          type: "group",
        },
      ];
      const data = { section: { items: [{ id: "1", label: "Hello" }] } };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("label");
      expect(chunks[0].path).toEqual(["section", "items", "0", "label"]);
      expect(chunks[0].dataRef).toBe(data.section.items[0]);
    });

    it("collects group fields inside array", () => {
      const schema: Field[] = [
        {
          fields: [
            {
              name: "meta",
              type: "group",
              fields: [{ name: "title", type: "text", localized: true }],
            },
          ],
          name: "items",
          type: "array",
        },
      ];
      const data = { items: [{ id: "1", meta: { title: "Hello" } }] };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
      expect(chunks[0].path).toEqual(["items", "0", "meta", "title"]);
      expect(chunks[0].dataRef).toBe(data.items[0].meta);
    });

    it("collects blocks fields inside group", () => {
      const schema: Field[] = [
        {
          fields: [
            {
              name: "content",
              type: "blocks",
              blocks: [
                {
                  slug: "text",
                  fields: [{ name: "body", type: "text", localized: true }],
                },
              ],
            },
          ],
          name: "hero",
          type: "group",
        },
      ];
      const data = {
        hero: { content: [{ blockType: "text", body: "Hello", id: "1" }] },
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("body");
      expect(chunks[0].path).toEqual(["hero", "content", "0", "body"]);
      expect(chunks[0].dataRef).toBe(data.hero.content[0]);
    });

    it("collects group fields inside blocks", () => {
      const schema: Field[] = [
        {
          blocks: [
            {
              slug: "card",
              fields: [
                {
                  name: "meta",
                  type: "group",
                  fields: [{ name: "title", type: "text", localized: true }],
                },
              ],
            },
          ],
          name: "layout",
          type: "blocks",
        },
      ];
      const data = {
        layout: [{ blockType: "card", id: "1", meta: { title: "Hello" } }],
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
      expect(chunks[0].path).toEqual(["layout", "0", "meta", "title"]);
      expect(chunks[0].dataRef).toBe(data.layout[0].meta);
    });

    it("collects blocks fields inside array", () => {
      const schema: Field[] = [
        {
          fields: [
            {
              name: "blocks",
              type: "blocks",
              blocks: [
                {
                  slug: "text",
                  fields: [{ name: "content", type: "text", localized: true }],
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
            blocks: [{ id: "b1", blockType: "text", content: "Hello" }],
            id: "1",
          },
        ],
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("content");
      expect(chunks[0].path).toEqual([
        "sections",
        "0",
        "blocks",
        "0",
        "content",
      ]);
      expect(chunks[0].dataRef).toBe(data.sections[0].blocks[0]);
    });

    it("collects fields from named tabs", () => {
      const schema: Field[] = [
        {
          tabs: [
            {
              name: "seo",
              fields: [{ name: "title", type: "text", localized: true }],
            },
          ],
          type: "tabs",
        },
      ];
      const data = { seo: { title: "SEO Title" } };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
      expect(chunks[0].path).toEqual(["seo", "title"]);
      expect(chunks[0].dataRef).toBe(data.seo);
    });

    it("collects fields from collapsible", () => {
      const schema: Field[] = [
        {
          fields: [{ name: "meta", type: "text", localized: true }],
          label: "Advanced",
          type: "collapsible",
        },
      ];
      const data = { meta: "Value" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("meta");
      expect(chunks[0].path).toEqual(["meta"]);
    });

    it("collects 4-level nested structure (tabs > group > array > blocks)", () => {
      const schema: Field[] = [
        {
          tabs: [
            {
              name: "content",
              fields: [
                {
                  name: "sections",
                  type: "group",
                  fields: [
                    {
                      name: "items",
                      type: "array",
                      fields: [
                        {
                          name: "blocks",
                          type: "blocks",
                          blocks: [
                            {
                              slug: "text",
                              fields: [
                                { name: "body", type: "text", localized: true },
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
          ],
          type: "tabs",
        },
      ];
      const data = {
        content: {
          sections: {
            items: [
              {
                blocks: [{ id: "b1", blockType: "text", body: "Deep content" }],
                id: "1",
              },
            ],
          },
        },
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("body");
      expect(chunks[0].path).toEqual([
        "content",
        "sections",
        "items",
        "0",
        "blocks",
        "0",
        "body",
      ]);
      expect(chunks[0].dataRef).toBe(data.content.sections.items[0].blocks[0]);
    });

    it("collects multiple fields from complex nested structure", () => {
      const schema: Field[] = [
        {
          fields: [
            { name: "title", type: "text", localized: true },
            {
              name: "sections",
              type: "array",
              fields: [
                { name: "heading", type: "text", localized: true },
                {
                  name: "content",
                  type: "blocks",
                  blocks: [
                    {
                      slug: "paragraph",
                      fields: [{ name: "text", type: "text", localized: true }],
                    },
                  ],
                },
              ],
            },
          ],
          name: "page",
          type: "group",
        },
      ];
      const data = {
        page: {
          sections: [
            {
              id: "1",
              heading: "Section 1",
              content: [
                { id: "b1", blockType: "paragraph", text: "Content 1" },
              ],
            },
            {
              id: "2",
              heading: "Section 2",
              content: [
                { id: "b2", blockType: "paragraph", text: "Content 2" },
              ],
            },
          ],
          title: "Page Title",
        },
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(5);
      expect(chunks.map((c) => c.path)).toEqual([
        ["page", "title"],
        ["page", "sections", "0", "heading"],
        ["page", "sections", "0", "content", "0", "text"],
        ["page", "sections", "1", "heading"],
        ["page", "sections", "1", "content", "0", "text"],
      ]);
    });
  });

  describe("dataRef mutation capability", () => {
    it("provides mutable reference to parent object", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const data = { title: "Hello" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      // Mutate through dataRef
      chunks[0].dataRef[chunks[0].key] = "Modified";

      expect(data.title).toBe("Modified");
    });

    it("provides mutable reference in nested structures", () => {
      const schema: Field[] = [
        {
          fields: [{ name: "label", type: "text", localized: true }],
          name: "items",
          type: "array",
        },
      ];
      const data = { items: [{ id: "1", label: "Original" }] };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        {},
        strategy
      );
      const chunks = collector.collect();

      // Mutate through dataRef
      chunks[0].dataRef[chunks[0].key] = "Modified";

      expect(data.items[0].label).toBe("Modified");
    });
  });

  describe("strategy filtering", () => {
    it("skips fields with existing target values (SkipExisting)", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const filteredData = { title: "Existing" };
      const sourceData = { title: "Hello" };
      const targetData = { title: "Existing" };

      const collector = new FieldChunkCollector(
        schema,
        filteredData,
        sourceData,
        targetData,
        skipExistingStrategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(0);
    });

    it("collects fields with empty target values (SkipExisting)", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const filteredData = { title: "Hello" };
      const sourceData = { title: "Hello" };
      const targetData = { title: "" };

      const collector = new FieldChunkCollector(
        schema,
        filteredData,
        sourceData,
        targetData,
        skipExistingStrategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
    });

    it("handles mixed fields with SkipExisting", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        { localized: true, name: "description", type: "text" },
      ];
      const filteredData = { description: "World", title: "Existing" };
      const sourceData = { description: "World", title: "Hello" };
      const targetData = { description: "", title: "Existing" };

      const collector = new FieldChunkCollector(
        schema,
        filteredData,
        sourceData,
        targetData,
        skipExistingStrategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("description");
    });

    it("collects all fields with OverwriteStrategy even when target exists", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const filteredData = { title: "Existing" };
      const sourceData = { title: "Hello" };
      const targetData = { title: "Existing" };

      const collector = new FieldChunkCollector(
        schema,
        filteredData,
        sourceData,
        targetData,
        strategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
    });

    it("applies SkipExisting to nested array fields", () => {
      const schema: Field[] = [
        {
          fields: [{ name: "label", type: "text", localized: true }],
          name: "items",
          type: "array",
        },
      ];
      const filteredData = {
        items: [
          { id: "1", label: "Translated" },
          { id: "2", label: "Second" },
        ],
      };
      const sourceData = {
        items: [
          { id: "1", label: "First" },
          { id: "2", label: "Second" },
        ],
      };
      const targetData = {
        items: [
          { id: "1", label: "Translated" },
          { id: "2", label: "" },
        ],
      };

      const collector = new FieldChunkCollector(
        schema,
        filteredData,
        sourceData,
        targetData,
        skipExistingStrategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].path).toEqual(["items", "1", "label"]);
    });

    it("applies SkipExisting to nested group fields", () => {
      const schema: Field[] = [
        {
          fields: [
            { name: "title", type: "text", localized: true },
            { name: "description", type: "text", localized: true },
          ],
          name: "meta",
          type: "group",
        },
      ];
      const filteredData = {
        meta: { description: "World", title: "Translated" },
      };
      const sourceData = { meta: { description: "World", title: "Hello" } };
      const targetData = { meta: { description: "", title: "Translated" } };

      const collector = new FieldChunkCollector(
        schema,
        filteredData,
        sourceData,
        targetData,
        skipExistingStrategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].path).toEqual(["meta", "description"]);
    });

    it("applies SkipExisting to blocks fields", () => {
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
      const filteredData = {
        layout: [
          { blockType: "text", content: "Translated", id: "1" },
          { blockType: "text", content: "World", id: "2" },
        ],
      };
      const sourceData = {
        layout: [
          { blockType: "text", content: "Hello", id: "1" },
          { blockType: "text", content: "World", id: "2" },
        ],
      };
      const targetData = {
        layout: [
          { blockType: "text", content: "Translated", id: "1" },
          { blockType: "text", content: "", id: "2" },
        ],
      };

      const collector = new FieldChunkCollector(
        schema,
        filteredData,
        sourceData,
        targetData,
        skipExistingStrategy
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].path).toEqual(["layout", "1", "content"]);
    });
  });

  describe("sourceValue mutation", () => {
    it("writes sourceValue to filteredData when shouldTranslate is true", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const filteredData = { title: "Target value" };
      const sourceData = { title: "Source value" };
      const targetData = { title: "Target value" };

      const collector = new FieldChunkCollector(
        schema,
        filteredData,
        sourceData,
        targetData,
        strategy
      );
      collector.collect();

      expect(filteredData.title).toBe("Source value");
    });

    it("does not modify filteredData when shouldTranslate is false", () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const filteredData = { title: "Existing" };
      const sourceData = { title: "Hello" };
      const targetData = { title: "Existing" };

      const collector = new FieldChunkCollector(
        schema,
        filteredData,
        sourceData,
        targetData,
        skipExistingStrategy
      );
      collector.collect();

      expect(filteredData.title).toBe("Existing");
    });

    it("writes sourceValue in nested structures", () => {
      const schema: Field[] = [
        {
          fields: [{ name: "title", type: "text", localized: true }],
          name: "meta",
          type: "group",
        },
      ];
      const filteredData = { meta: { title: "Target" } };
      const sourceData = { meta: { title: "Source" } };
      const targetData = { meta: { title: "Target" } };

      const collector = new FieldChunkCollector(
        schema,
        filteredData,
        sourceData,
        targetData,
        strategy
      );
      collector.collect();

      expect(filteredData.meta.title).toBe("Source");
    });

    it("writes sourceValue in array items", () => {
      const schema: Field[] = [
        {
          fields: [{ name: "label", type: "text", localized: true }],
          name: "items",
          type: "array",
        },
      ];
      const filteredData = { items: [{ id: "1", label: "Target" }] };
      const sourceData = { items: [{ id: "1", label: "Source" }] };
      const targetData = { items: [{ id: "1", label: "Target" }] };

      const collector = new FieldChunkCollector(
        schema,
        filteredData,
        sourceData,
        targetData,
        strategy
      );
      collector.collect();

      expect(filteredData.items[0].label).toBe("Source");
    });
  });
});
