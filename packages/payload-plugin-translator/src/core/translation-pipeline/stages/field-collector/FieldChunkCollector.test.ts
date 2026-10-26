import { describe, it, expect } from "vitest";
import type { Field } from "payload";
import { FieldChunkCollector } from "./FieldChunkCollector.js";
import { everyTranslatableLeaf } from "../../../domain/content-projection/contentProjector.js";

describe("FieldChunkCollector", () => {
  describe("simple fields", () => {
    it("collects localized text fields", () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const data = { title: "Hello" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
      expect(chunks[0].idPath).toBe("title");
      expect(chunks[0].dataRef).toBe(data);
      expect(chunks[0].schema.type).toBe("text");
    });

    it("collects multiple localized fields", () => {
      const schema: Field[] = [
        { name: "title", type: "text", localized: true },
        { name: "description", type: "textarea", localized: true },
      ];
      const data = { title: "Hello", description: "World" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(2);
      expect(chunks.map((c) => c.key)).toEqual(["title", "description"]);
    });

    it("skips non-localized fields", () => {
      const schema: Field[] = [
        { name: "title", type: "text", localized: true },
        { name: "slug", type: "text", localized: false },
      ];
      const data = { title: "Hello", slug: "hello" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
    });

    it("skips non-translatable fields", () => {
      const schema: Field[] = [
        { name: "title", type: "text", localized: true },
        { name: "author", type: "relationship", relationTo: "users", localized: true },
      ];
      const data = { title: "Hello", author: "123" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
    });

    it("skips null and undefined values", () => {
      const schema: Field[] = [
        { name: "title", type: "text", localized: true },
        { name: "subtitle", type: "text", localized: true },
      ];
      const data = { title: null, subtitle: undefined };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(0);
    });
  });

  describe("group fields", () => {
    it("collects nested fields with correct path", () => {
      const schema: Field[] = [
        {
          name: "meta",
          type: "group",
          fields: [{ name: "title", type: "text", localized: true }],
        },
      ];
      const data = { meta: { title: "Hello" } };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
      expect(chunks[0].idPath).toBe("meta.title");
      expect(chunks[0].dataRef).toBe(data.meta);
    });

    it("collects deeply nested fields", () => {
      const schema: Field[] = [
        {
          name: "level1",
          type: "group",
          fields: [
            {
              name: "level2",
              type: "group",
              fields: [{ name: "title", type: "text", localized: true }],
            },
          ],
        },
      ];
      const data = { level1: { level2: { title: "Deep" } } };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].idPath).toBe("level1.level2.title");
      expect(chunks[0].dataRef).toBe(data.level1.level2);
    });
  });

  describe("array fields", () => {
    it("collects fields from each array item", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
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
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(2);
      expect(chunks[0].idPath).toBe("items.1.label");
      expect(chunks[1].idPath).toBe("items.2.label");
      expect(chunks[0].dataRef).toBe(data.items[0]);
      expect(chunks[1].dataRef).toBe(data.items[1]);
    });

    it("uses numeric index in path", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "text", type: "text", localized: true }],
        },
      ];
      const data = { items: [{ id: "1", text: "Hello" }] };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks[0].idPath).toBe("items.1.text");
    });
  });

  describe("blocks fields", () => {
    it("collects fields from blocks with correct path", () => {
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
      const data = {
        layout: [{ id: "1", blockType: "text", content: "Hello" }],
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].idPath).toBe("layout.1:text.content");
      expect(chunks[0].dataRef).toBe(data.layout[0]);
    });

    it("handles multiple block types", () => {
      const schema: Field[] = [
        {
          name: "layout",
          type: "blocks",
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
        },
      ];
      const data = {
        layout: [
          { id: "1", blockType: "text", content: "Hello" },
          { id: "2", blockType: "heading", title: "Title" },
        ],
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(2);
      expect(chunks[0].key).toBe("content");
      expect(chunks[1].key).toBe("title");
    });

    it("skips unknown block types", () => {
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
      const data = {
        layout: [{ id: "1", blockType: "unknown", content: "Hello" }],
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(0);
    });
  });

  describe("tabs and row fields", () => {
    it("collects fields from tabs", () => {
      const schema: Field[] = [
        {
          type: "tabs",
          tabs: [
            {
              label: "Content",
              fields: [{ name: "title", type: "text", localized: true }],
            },
          ],
        },
      ];
      const data = { title: "Hello" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].idPath).toBe("title");
    });

    it("collects fields from row", () => {
      const schema: Field[] = [
        {
          type: "row",
          fields: [{ name: "title", type: "text", localized: true }],
        },
      ];
      const data = { title: "Hello" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].idPath).toBe("title");
    });

    it("collects fields from unnamed group (no name property)", () => {
      const schema: Field[] = [
        {
          type: "group",
          fields: [
            { name: "title", type: "text", localized: true },
            { name: "description", type: "textarea", localized: true },
          ],
        } as Field, // Cast needed because group without name is valid but not in strict types
      ];
      const data = { title: "Hello", description: "World" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(2);
      expect(chunks[0].idPath).toBe("title");
      expect(chunks[1].idPath).toBe("description");
      expect(chunks[0].dataRef).toBe(data);
    });
  });

  describe("complex nested structures", () => {
    it("collects array fields inside group", () => {
      const schema: Field[] = [
        {
          name: "section",
          type: "group",
          fields: [
            {
              name: "items",
              type: "array",
              fields: [{ name: "label", type: "text", localized: true }],
            },
          ],
        },
      ];
      const data = { section: { items: [{ id: "1", label: "Hello" }] } };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("label");
      expect(chunks[0].idPath).toBe("section.items.1.label");
      expect(chunks[0].dataRef).toBe(data.section.items[0]);
    });

    it("collects group fields inside array", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [
            {
              name: "meta",
              type: "group",
              fields: [{ name: "title", type: "text", localized: true }],
            },
          ],
        },
      ];
      const data = { items: [{ id: "1", meta: { title: "Hello" } }] };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
      expect(chunks[0].idPath).toBe("items.1.meta.title");
      expect(chunks[0].dataRef).toBe(data.items[0].meta);
    });

    it("collects blocks fields inside group", () => {
      const schema: Field[] = [
        {
          name: "hero",
          type: "group",
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
        },
      ];
      const data = { hero: { content: [{ id: "1", blockType: "text", body: "Hello" }] } };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("body");
      expect(chunks[0].idPath).toBe("hero.content.1:text.body");
      expect(chunks[0].dataRef).toBe(data.hero.content[0]);
    });

    it("collects group fields inside blocks", () => {
      const schema: Field[] = [
        {
          name: "layout",
          type: "blocks",
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
        },
      ];
      const data = { layout: [{ id: "1", blockType: "card", meta: { title: "Hello" } }] };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
      expect(chunks[0].idPath).toBe("layout.1:card.meta.title");
      expect(chunks[0].dataRef).toBe(data.layout[0].meta);
    });

    it("collects blocks fields inside array", () => {
      const schema: Field[] = [
        {
          name: "sections",
          type: "array",
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
        },
      ];
      const data = {
        sections: [{ id: "1", blocks: [{ id: "b1", blockType: "text", content: "Hello" }] }],
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("content");
      expect(chunks[0].idPath).toBe("sections.1.blocks.b1:text.content");
      expect(chunks[0].dataRef).toBe(data.sections[0].blocks[0]);
    });

    it("collects fields from named tabs", () => {
      const schema: Field[] = [
        {
          type: "tabs",
          tabs: [
            {
              name: "seo",
              fields: [{ name: "title", type: "text", localized: true }],
            },
          ],
        },
      ];
      const data = { seo: { title: "SEO Title" } };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("title");
      expect(chunks[0].idPath).toBe("seo.title");
      expect(chunks[0].dataRef).toBe(data.seo);
    });

    it("collects fields from collapsible", () => {
      const schema: Field[] = [
        {
          type: "collapsible",
          label: "Advanced",
          fields: [{ name: "meta", type: "text", localized: true }],
        },
      ];
      const data = { meta: "Value" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("meta");
      expect(chunks[0].idPath).toBe("meta");
    });

    it("collects 4-level nested structure (tabs > group > array > blocks)", () => {
      const schema: Field[] = [
        {
          type: "tabs",
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
                              fields: [{ name: "body", type: "text", localized: true }],
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
      const data = {
        content: {
          sections: {
            items: [{ id: "1", blocks: [{ id: "b1", blockType: "text", body: "Deep content" }] }],
          },
        },
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("body");
      expect(chunks[0].idPath).toBe("content.sections.items.1.blocks.b1:text.body");
      expect(chunks[0].dataRef).toBe(data.content.sections.items[0].blocks[0]);
    });

    it("collects multiple fields from complex nested structure", () => {
      const schema: Field[] = [
        {
          name: "page",
          type: "group",
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
        },
      ];
      const data = {
        page: {
          title: "Page Title",
          sections: [
            {
              id: "1",
              heading: "Section 1",
              content: [{ id: "b1", blockType: "paragraph", text: "Content 1" }],
            },
            {
              id: "2",
              heading: "Section 2",
              content: [{ id: "b2", blockType: "paragraph", text: "Content 2" }],
            },
          ],
        },
      };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(5);
      expect(chunks.map((c) => c.idPath)).toEqual([
        "page.title",
        "page.sections.1.heading",
        "page.sections.1.content.b1:paragraph.text",
        "page.sections.2.heading",
        "page.sections.2.content.b2:paragraph.text",
      ]);
    });
  });

  describe("dataRef mutation capability", () => {
    it("provides mutable reference to parent object", () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const data = { title: "Hello" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      // Mutate through dataRef
      chunks[0].dataRef[chunks[0].key] = "Modified";

      expect(data.title).toBe("Modified");
    });

    it("provides mutable reference in nested structures", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ];
      const data = { items: [{ id: "1", label: "Original" }] };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      // Mutate through dataRef
      chunks[0].dataRef[chunks[0].key] = "Modified";

      expect(data.items[0].label).toBe("Modified");
    });
  });

  describe("what the selection decides", () => {
    const addressed: Field[] = [
      { name: "title", type: "text", localized: true },
      { name: "meta", type: "group", fields: [{ name: "title", type: "text", localized: true }] },
      { name: "items", type: "array", fields: [{ name: "label", type: "text", localized: true }] },
      {
        name: "layout",
        type: "blocks",
        blocks: [{ slug: "text", fields: [{ name: "content", type: "text", localized: true }] }],
      },
    ];
    const addressedData = {
      title: "Hello",
      meta: { title: "Meta" },
      items: [
        { id: "a1", label: "First" },
        { id: "a2", label: "Second" },
      ],
      layout: [
        { id: "b1", blockType: "text", content: "One" },
        { id: "b2", blockType: "text", content: "Two" },
      ],
    };
    const collect = (selection: string[]) =>
      new FieldChunkCollector(addressed, addressedData, addressedData, selection)
        .collect()
        .map((chunk) => String(chunk.idPath));

    it("collects a leaf the selection names", () => {
      expect(collect(["title"])).toEqual(["title"]);
    });

    it("leaves out a leaf the selection does not name", () => {
      expect(collect(["title"])).not.toContain("meta.title");
    });

    it("collects nothing when the selection names nothing", () => {
      expect(collect([])).toEqual([]);
    });

    it("reads the selection by the leaf's address, not by its field name", () => {
      expect(collect(["meta.title"])).toEqual(["meta.title"]);
    });

    it("collects one array element's leaf and leaves its sibling alone", () => {
      expect(collect(["items.a2.label"])).toEqual(["items.a2.label"]);
    });

    it("collects one block's leaf and leaves its sibling alone", () => {
      expect(collect(["layout.b1:text.content"])).toEqual(["layout.b1:text.content"]);
    });

    it("leaves out a named leaf whose source is empty", () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const data = { title: "   " };

      const chunks = new FieldChunkCollector(schema, data, data, ["title"]).collect();

      expect(chunks).toEqual([]);
    });
  });

  describe("sourceValue mutation", () => {
    it("writes the source value into reconciledData for a selected leaf", () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const reconciledData = { title: "Target value" };
      const sourceData = { title: "Source value" };

      const collector = new FieldChunkCollector(schema, reconciledData, sourceData, ["title"]);
      collector.collect();

      expect(reconciledData.title).toBe("Source value");
    });

    it("leaves reconciledData alone for a leaf the selection left out", () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const reconciledData = { title: "Existing" };
      const sourceData = { title: "Hello" };

      const collector = new FieldChunkCollector(schema, reconciledData, sourceData, []);
      collector.collect();

      expect(reconciledData.title).toBe("Existing");
    });

    it("writes sourceValue in nested structures", () => {
      const schema: Field[] = [
        {
          name: "meta",
          type: "group",
          fields: [{ name: "title", type: "text", localized: true }],
        },
      ];
      const reconciledData = { meta: { title: "Target" } };
      const sourceData = { meta: { title: "Source" } };

      const collector = new FieldChunkCollector(schema, reconciledData, sourceData, ["meta.title"]);
      collector.collect();

      expect(reconciledData.meta.title).toBe("Source");
    });

    it("writes sourceValue in array items", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ];
      const reconciledData = { items: [{ id: "1", label: "Target" }] };
      const sourceData = { items: [{ id: "1", label: "Source" }] };

      const collector = new FieldChunkCollector(schema, reconciledData, sourceData, [
        "items.1.label",
      ]);
      collector.collect();

      expect(reconciledData.items[0].label).toBe("Source");
    });
  });

  describe("array edge cases", () => {
    it("skips non-object items in arrays (no chunk, no crash)", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ];
      const data = { items: [{ id: "1", label: "A" }, "garbage", null] };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].idPath).toBe("items.1.label");
    });

    it("collects nothing for an element the source array does not reach", () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ];
      const reconciledData = {
        items: [
          { id: "1", label: "A" },
          { id: "2", label: "B" },
        ],
      };
      const sourceData = { items: [{ id: "1", label: "A" }] };

      const collector = new FieldChunkCollector(schema, reconciledData, sourceData, [
        "items.1.label",
        "items.2.label",
      ]);
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].idPath).toBe("items.1.label");
    });
  });

  describe("excluded fields", () => {
    it("skips fields excluded via custom.translateKit.exclude", () => {
      const schema: Field[] = [
        {
          name: "title",
          type: "text",
          localized: true,
          custom: { translateKit: { exclude: true } },
        },
        { name: "subtitle", type: "text", localized: true },
      ];
      const data = { title: "Hello", subtitle: "World" };

      const collector = new FieldChunkCollector(
        schema,
        data,
        data,
        everyTranslatableLeaf(data, schema)
      );
      const chunks = collector.collect();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe("subtitle"); // title excluded via translateKit.exclude
    });
  });
});

/*
 * A selection arrives from a request, which names addresses as free strings — nothing upstream
 * checks them against the collection's schema. `isTranslatableLeaf` is the only thing standing
 * between a named address and a write into a field the host never offered for translation.
 */
describe("a selection naming a leaf the schema does not offer", () => {
  const collected = (schema: Field[], data: Record<string, unknown>, selection: string[]) =>
    new FieldChunkCollector(schema, data, data, selection).collect();

  it("sends nothing for a field that is not localized", () => {
    const schema: Field[] = [{ name: "slug", type: "text" }];

    expect(collected(schema, { slug: "hello-world" }, ["slug"])).toEqual([]);
  });

  it("sends nothing for a field the host excluded from translation", () => {
    const schema: Field[] = [
      { name: "title", type: "text", localized: true, custom: { translateKit: { exclude: true } } },
    ];

    expect(collected(schema, { title: "Hello" }, ["title"])).toEqual([]);
  });

  it("sends nothing for a field type this package does not translate", () => {
    const schema: Field[] = [{ name: "count", type: "number", localized: true }];

    expect(collected(schema, { count: 7 }, ["count"])).toEqual([]);
  });

  it("still sends the sibling the schema does offer", () => {
    const schema: Field[] = [
      { name: "slug", type: "text" },
      { name: "title", type: "text", localized: true },
    ];

    const chunks = collected(schema, { slug: "hello", title: "Hello" }, ["slug", "title"]);

    expect(chunks.map((chunk) => chunk.idPath)).toEqual(["title"]);
  });
});
