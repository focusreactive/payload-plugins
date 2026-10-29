import { describe, it, expect, vi } from "vitest";
import type { Field } from "payload";
import { TranslationPipeline } from "./TranslationPipeline.js";
import { everyTranslatableLeaf } from "../domain/content-projection/contentProjector.js";
import type { TranslationProvider } from "../domain/translation-providers/index.js";

const createMockProvider = (
  translationFn?: (textMap: Record<number, string>) => Record<number, string>
): TranslationProvider => ({
  translate: vi.fn().mockImplementation(async (textMap: Record<number, string>) => {
    if (translationFn) return translationFn(textMap);
    // Default: prefix each value with "TR_"
    const result: Record<number, string> = {};
    for (const [key, value] of Object.entries(textMap)) {
      result[Number(key)] = `TR_${value}`;
    }
    return result;
  }),
});

describe("TranslationPipeline", () => {
  describe("basic translation", () => {
    it("translates simple text fields", async () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const sourceData = { title: "Hello" };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect(result).not.toBeNull();
      expect(result!.translatedData).toEqual({ title: "TR_Hello" });
      expect(provider.translate).toHaveBeenCalledWith({ 0: "Hello" }, "en", "ru", {
        document: { collection: "docs", id: "1" },
      });
    });

    it("translates multiple fields", async () => {
      const schema: Field[] = [
        { name: "title", type: "text", localized: true },
        { name: "description", type: "textarea", localized: true },
      ];
      const sourceData = { title: "Hello", description: "World" };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect(result).not.toBeNull();
      expect(result!.translatedData).toEqual({ title: "TR_Hello", description: "TR_World" });
    });

    it("translates nested fields in groups", async () => {
      const schema: Field[] = [
        {
          name: "meta",
          type: "group",
          fields: [{ name: "title", type: "text", localized: true }],
        },
      ];
      const sourceData = { meta: { title: "Hello" } };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect(result).not.toBeNull();
      expect(result!.translatedData).toEqual({ meta: { title: "TR_Hello" } });
    });

    it("translates array items", async () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ];
      const sourceData = {
        items: [
          { id: "1", label: "First" },
          { id: "2", label: "Second" },
        ],
      };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect(result).not.toBeNull();
      // Non-localized array → shared rows → id kept so Payload updates them in place.
      expect(result!.translatedData).toEqual({
        items: [
          { id: "1", label: "TR_First" },
          { id: "2", label: "TR_Second" },
        ],
      });
    });
  });

  describe("richText translation", () => {
    it("translates richText text nodes", async () => {
      const schema: Field[] = [{ name: "content", type: "richText", localized: true }];
      const sourceData = {
        content: {
          root: {
            type: "root",
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "Hello", version: 1 }],
                version: 1,
              },
            ],
            version: 1,
          },
        },
      };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect(result).not.toBeNull();
      // The richText structure should have translated text nodes
      const content = result!.translatedData.content as {
        root: { children: { children: { text: string }[] }[] };
      };
      expect(content.root.children[0].children[0].text).toBe("TR_Hello");
    });
  });

  describe("richText with nested Lexical blocks", () => {
    it("translates text nodes and preserves block node fields (upload, arrays) unchanged", async () => {
      const schema: Field[] = [{ name: "content", type: "richText", localized: true }];
      const sourceData = {
        content: {
          root: {
            type: "root",
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "Intro text", version: 1 }],
                version: 1,
              },
              {
                type: "block",
                fields: {
                  blockType: "logoItems",
                  items: [
                    { id: "item-1", image: 5, caption: "First logo" },
                    { id: "item-2", image: 10, caption: "Second logo" },
                  ],
                },
                version: 1,
              },
              {
                type: "paragraph",
                children: [{ type: "text", text: "Outro text", version: 1 }],
                version: 1,
              },
            ],
            version: 1,
          },
        },
      };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "es",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect(result).not.toBeNull();
      const root = (result!.translatedData.content as any).root;

      // Text nodes are translated
      expect(root.children[0].children[0].text).toBe("TR_Intro text");
      expect(root.children[2].children[0].text).toBe("TR_Outro text");

      // Block node fields are preserved as-is (upload IDs stay as numbers, not populated objects)
      const blockFields = root.children[1].fields;
      expect(blockFields.blockType).toBe("logoItems");
      expect(blockFields.items).toHaveLength(2);
      expect(blockFields.items[0].image).toBe(5);
      expect(blockFields.items[1].image).toBe(10);
      expect(blockFields.items[0].caption).toBe("First logo");
    });

    it("preserves block nodes with upload fields when target has existing richText", async () => {
      const schema: Field[] = [{ name: "content", type: "richText", localized: true }];
      const blockNode = {
        type: "block",
        fields: {
          blockType: "imageGallery",
          images: [
            { id: "img-1", file: 42 },
            { id: "img-2", file: 43 },
          ],
        },
        version: 1,
      };
      const sourceData = {
        content: {
          root: {
            type: "root",
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "Hello", version: 1 }],
                version: 1,
              },
              blockNode,
            ],
            version: 1,
          },
        },
      };
      const targetData = {
        content: {
          root: {
            type: "root",
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "Hola", version: 1 }],
                version: 1,
              },
              blockNode,
            ],
            version: 1,
          },
        },
      };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "es",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect(result).not.toBeNull();
      const root = (result!.translatedData.content as any).root;

      // Text translated
      expect(root.children[0].children[0].text).toBe("TR_Hello");

      // Block fields preserved with original upload IDs
      expect(root.children[1].fields.images[0].file).toBe(42);
      expect(root.children[1].fields.images[1].file).toBe(43);
    });

    it("handles richText with only block nodes (no text to translate)", async () => {
      const schema: Field[] = [{ name: "content", type: "richText", localized: true }];
      const sourceData = {
        content: {
          root: {
            type: "root",
            children: [
              {
                type: "block",
                fields: {
                  blockType: "banner",
                  image: 99,
                  altText: "Banner image",
                },
                version: 1,
              },
            ],
            version: 1,
          },
        },
      };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "es",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      // No text nodes to translate — pipeline returns null
      expect(result).toBeNull();
      expect(provider.translate).not.toHaveBeenCalled();
    });
  });

  describe("what the selection leaves out", () => {
    it("translates every leaf the selection names", async () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const sourceData = { title: "Hello" };
      const targetData = { title: "Existing translation" };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect(result).not.toBeNull();
      expect(result!.translatedData.title).toBe("TR_Hello");
    });

    it("keeps the target text of a leaf the selection left out", async () => {
      const schema: Field[] = [
        { name: "title", type: "text", localized: true },
        { name: "description", type: "text", localized: true },
      ];
      const sourceData = { title: "Hello", description: "World" };
      const targetData = { title: "Existing", description: "" };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: ["description"],
      });

      expect(result).not.toBeNull();
      expect(result!.translatedData).toEqual({
        title: "Existing",
        description: "TR_World",
      });
    });
  });

  describe("early exit conditions", () => {
    it("returns null when no localized fields", async () => {
      const schema: Field[] = [{ name: "slug", type: "text", localized: false }];
      const sourceData = { slug: "hello" };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect(result).toBeNull();
      expect(provider.translate).not.toHaveBeenCalled();
    });

    it("returns null when the selection names nothing", async () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const sourceData = { title: "Hello" };
      const targetData = { title: "Already translated" };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: [],
      });

      expect(result).toBeNull();
      expect(provider.translate).not.toHaveBeenCalled();
    });

    it("returns null when source fields are empty", async () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const sourceData = { title: "" };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect(result).toBeNull();
    });
  });

  describe("error handling", () => {
    it("throws when translation provider returns null", async () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const sourceData = { title: "Hello" };
      const targetData = {};

      const provider: TranslationProvider = {
        translate: vi.fn().mockResolvedValue(null),
      };
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      await expect(
        pipeline.execute({
          document: { collection: "docs", id: "1" },
          schema,
          sourceData,
          targetData,
          sourceLng: "en",
          targetLng: "ru",
          selection: everyTranslatableLeaf(sourceData, schema),
        })
      ).rejects.toThrow("Translation provider returned null");
    });
  });

  describe("data mutation", () => {
    it("returns translated data without mutating original sourceData", async () => {
      const schema: Field[] = [{ name: "title", type: "text", localized: true }];
      const sourceData = { title: "Hello" };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      // Result contains translated data
      expect(result!.translatedData.title).toBe("TR_Hello");
      // Original sourceData is NOT mutated (pipeline works on filtered copy)
      expect(sourceData.title).toBe("Hello");
    });
  });

  describe("full document shape preservation", () => {
    it("preserves non-localized fields in result", async () => {
      const schema: Field[] = [
        { name: "title", type: "text", localized: true },
        { name: "slug", type: "text", localized: false },
        { name: "order", type: "number", localized: false },
      ];
      const sourceData = { title: "Hello", slug: "hello", order: 1 };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect(result!.translatedData).toEqual({
        title: "TR_Hello",
        slug: "hello",
        order: 1,
      });
    });

    it("preserves existing target non-localized values", async () => {
      const schema: Field[] = [
        { name: "title", type: "text", localized: true },
        { name: "slug", type: "text", localized: false },
      ];
      const sourceData = { title: "Hello", slug: "hello" };
      const targetData = { title: "", slug: "other-slug" };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect(result!.translatedData).toEqual({
        title: "TR_Hello",
        slug: "other-slug",
      });
    });

    it("keeps a left-out leaf's target text in the full document shape", async () => {
      const schema: Field[] = [
        { name: "title", type: "text", localized: true },
        { name: "description", type: "text", localized: true },
        { name: "slug", type: "text", localized: false },
      ];
      const sourceData = { title: "Hello", description: "World", slug: "hello" };
      const targetData = { title: "Translated", description: "", slug: "other" };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: ["description"],
      });

      expect(result!.translatedData).toEqual({
        title: "Translated",
        description: "TR_World",
        slug: "other",
      });
    });
  });

  describe("nested structures", () => {
    it("sends one element of an array and leaves its sibling alone", async () => {
      const schema: Field[] = [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ];
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

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: ["items.2.label"],
      });

      // Non-localized array → shared rows → id kept.
      expect(result!.translatedData.items).toEqual([
        { id: "1", label: "Translated" },
        { id: "2", label: "TR_Second" },
      ]);
    });

    it("sends one leaf of a group and leaves its sibling alone", async () => {
      const schema: Field[] = [
        {
          name: "meta",
          type: "group",
          fields: [
            { name: "title", type: "text", localized: true },
            { name: "description", type: "text", localized: true },
          ],
        },
      ];
      const sourceData = { meta: { title: "Hello", description: "World" } };
      const targetData = { meta: { title: "Translated", description: "" } };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: ["meta.description"],
      });

      expect(result!.translatedData.meta).toEqual({
        title: "Translated",
        description: "TR_World",
      });
    });

    it("sends one block and leaves its sibling alone", async () => {
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
        layout: [
          { id: "1", blockType: "text", content: "Hello" },
          { id: "2", blockType: "text", content: "World" },
        ],
      };
      const targetData = {
        layout: [
          { id: "1", blockType: "text", content: "Translated" },
          { id: "2", blockType: "text", content: "" },
        ],
      };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: ["layout.2:text.content"],
      });

      // Non-localized blocks → shared rows → id kept.
      expect(result!.translatedData.layout).toEqual([
        { id: "1", blockType: "text", content: "Translated" },
        { id: "2", blockType: "text", content: "TR_World" },
      ]);
    });
  });

  describe("translateKit.exclude handling", () => {
    it("skips excluded fields from translation", async () => {
      const schema: Field[] = [
        { name: "title", type: "text", localized: true },
        {
          name: "sku",
          type: "text",
          localized: true,
          custom: { translateKit: { exclude: true } },
        },
      ];
      const sourceData = { title: "Hello", sku: "SKU-123" };
      const targetData = { sku: "SKU-456" };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect(result!.translatedData.title).toBe("TR_Hello");
      expect(result!.translatedData.sku).toBe("SKU-456");
    });

    it("uses source value for excluded fields when target is empty", async () => {
      const schema: Field[] = [
        { name: "title", type: "text", localized: true },
        {
          name: "sku",
          type: "text",
          localized: true,
          custom: { translateKit: { exclude: true } },
        },
      ];
      const sourceData = { title: "Hello", sku: "SKU-123" };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData,
        sourceLng: "en",
        targetLng: "ru",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect(result!.translatedData.title).toBe("TR_Hello");
      expect(result!.translatedData.sku).toBe("SKU-123");
    });
  });

  describe("reporting back which leaves it translated", () => {
    const schema: Field[] = [
      { name: "title", type: "text", localized: true },
      { name: "body", type: "text", localized: true },
      {
        name: "items",
        type: "array",
        fields: [{ name: "label", type: "text", localized: true }],
      },
    ];
    const sourceData = {
      title: "Hello",
      body: "World",
      items: [{ id: "a1", label: "First" }],
    };

    it("names every leaf it sent, by the same address the receipt is keyed on", async () => {
      const pipeline = new TranslationPipeline({
        translationProvider: createMockProvider(),
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData: {},
        sourceLng: "en",
        targetLng: "de",
        selection: everyTranslatableLeaf(sourceData, schema),
      });

      expect((result?.leaves ?? []).map((leaf) => String(leaf.idPath)).sort()).toEqual([
        "body",
        "items.a1.label",
        "title",
      ]);
    });

    it("names only the leaves it was asked for", async () => {
      const pipeline = new TranslationPipeline({
        translationProvider: createMockProvider(),
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData: { body: "Welt", items: [{ id: "a1", label: "" }] },
        sourceLng: "en",
        targetLng: "de",
        selection: ["title", "items.a1.label"],
      });

      expect((result?.leaves ?? []).map((leaf) => String(leaf.idPath)).sort()).toEqual([
        "items.a1.label",
        "title",
      ]);
    });

    it("sends only the leaves the selection names", async () => {
      const pipeline = new TranslationPipeline({
        translationProvider: createMockProvider(),
      });

      const result = await pipeline.execute({
        document: { collection: "docs", id: "1" },
        schema,
        sourceData,
        targetData: { title: "Hallo", body: "Welt", items: [{ id: "a1", label: "Erste" }] },
        sourceLng: "en",
        targetLng: "de",
        selection: ["title"],
      });

      expect(result?.leaves).toEqual([{ idPath: "title", answeredInFull: true }]);
    });
  });
});
