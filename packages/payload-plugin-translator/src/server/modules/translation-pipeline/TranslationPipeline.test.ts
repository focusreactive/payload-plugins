import type { Field } from "payload";
import { describe, it, expect, vi } from "vitest";

import type { TranslationProvider } from "../translation-providers";
import { OverwriteStrategy } from "./strategies/Overwrite.strategy";
import { SkipExistingStrategy } from "./strategies/SkipExisting.strategy";
import { TranslationPipeline } from "./TranslationPipeline";

const createMockProvider = (
  translationFn?: (textMap: Record<number, string>) => Record<number, string>
): TranslationProvider => ({
  translate: vi
    .fn()
    .mockImplementation(async (textMap: Record<number, string>) => {
      if (translationFn) {return translationFn(textMap);}
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
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const sourceData = { title: "Hello" };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result).not.toBeNull();
      expect(result!.translatedData).toEqual({ title: "TR_Hello" });
      expect(provider.translate).toHaveBeenCalledWith(
        { 0: "Hello" },
        "en",
        "ru"
      );
    });

    it("translates multiple fields", async () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        { localized: true, name: "description", type: "textarea" },
      ];
      const sourceData = { description: "World", title: "Hello" };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result).not.toBeNull();
      expect(result!.translatedData).toEqual({
        description: "TR_World",
        title: "TR_Hello",
      });
    });

    it("translates nested fields in groups", async () => {
      const schema: Field[] = [
        {
          fields: [{ name: "title", type: "text", localized: true }],
          name: "meta",
          type: "group",
        },
      ];
      const sourceData = { meta: { title: "Hello" } };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result).not.toBeNull();
      expect(result!.translatedData).toEqual({ meta: { title: "TR_Hello" } });
    });

    it("translates array items", async () => {
      const schema: Field[] = [
        {
          fields: [{ name: "label", type: "text", localized: true }],
          name: "items",
          type: "array",
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
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result).not.toBeNull();
      // Note: id is not included in result - Postgres rejects it on update
      expect(result!.translatedData).toEqual({
        items: [{ label: "TR_First" }, { label: "TR_Second" }],
      });
    });
  });

  describe("richText translation", () => {
    it("translates richText text nodes", async () => {
      const schema: Field[] = [
        { localized: true, name: "content", type: "richText" },
      ];
      const sourceData = {
        content: {
          root: {
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "Hello", version: 1 }],
                version: 1,
              },
            ],
            type: "root",
            version: 1,
          },
        },
      };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
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
      const schema: Field[] = [
        { localized: true, name: "content", type: "richText" },
      ];
      const sourceData = {
        content: {
          root: {
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
            type: "root",
            version: 1,
          },
        },
      };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "es",
      });

      expect(result).not.toBeNull();
      const {root} = (result!.translatedData.content as any);

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
      const schema: Field[] = [
        { localized: true, name: "content", type: "richText" },
      ];
      const blockNode = {
        fields: {
          blockType: "imageGallery",
          images: [
            { id: "img-1", file: 42 },
            { id: "img-2", file: 43 },
          ],
        },
        type: "block",
        version: 1,
      };
      const sourceData = {
        content: {
          root: {
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "Hello", version: 1 }],
                version: 1,
              },
              blockNode,
            ],
            type: "root",
            version: 1,
          },
        },
      };
      const targetData = {
        content: {
          root: {
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "Hola", version: 1 }],
                version: 1,
              },
              blockNode,
            ],
            type: "root",
            version: 1,
          },
        },
      };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "es",
      });

      expect(result).not.toBeNull();
      const {root} = (result!.translatedData.content as any);

      // Text translated
      expect(root.children[0].children[0].text).toBe("TR_Hello");

      // Block fields preserved with original upload IDs
      expect(root.children[1].fields.images[0].file).toBe(42);
      expect(root.children[1].fields.images[1].file).toBe(43);
    });

    it("handles richText with only block nodes (no text to translate)", async () => {
      const schema: Field[] = [
        { localized: true, name: "content", type: "richText" },
      ];
      const sourceData = {
        content: {
          root: {
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
            type: "root",
            version: 1,
          },
        },
      };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "es",
      });

      // No text nodes to translate — pipeline returns null
      expect(result).toBeNull();
      expect(provider.translate).not.toHaveBeenCalled();
    });
  });

  describe("strategy filtering", () => {
    it("OverwriteStrategy translates all fields", async () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const sourceData = { title: "Hello" };
      const targetData = { title: "Existing translation" };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result).not.toBeNull();
      expect(result!.translatedData.title).toBe("TR_Hello");
    });

    it("SkipExistingStrategy skips fields with existing translations", async () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        { localized: true, name: "description", type: "text" },
      ];
      const sourceData = { description: "World", title: "Hello" };
      const targetData = { description: "", title: "Existing" };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new SkipExistingStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result).not.toBeNull();
      // Result contains full document shape
      // title: kept from target (already translated)
      // description: translated from source
      expect(result!.translatedData).toEqual({
        description: "TR_World",
        title: "Existing",
      });
    });
  });

  describe("early exit conditions", () => {
    it("returns null when no localized fields", async () => {
      const schema: Field[] = [
        { localized: false, name: "slug", type: "text" },
      ];
      const sourceData = { slug: "hello" };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result).toBeNull();
      expect(provider.translate).not.toHaveBeenCalled();
    });

    it("returns null when all fields already translated (SkipExisting)", async () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const sourceData = { title: "Hello" };
      const targetData = { title: "Already translated" };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new SkipExistingStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result).toBeNull();
      expect(provider.translate).not.toHaveBeenCalled();
    });

    it("returns null when source fields are empty", async () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const sourceData = { title: "" };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result).toBeNull();
    });
  });

  describe("error handling", () => {
    it("throws when translation provider returns null", async () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const sourceData = { title: "Hello" };
      const targetData = {};

      const provider: TranslationProvider = {
        translate: vi.fn().mockResolvedValue(null),
      };
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      await expect(
        pipeline.execute({
          schema,
          sourceData,
          sourceLng: "en",
          targetData,
          targetLng: "ru",
        })
      ).rejects.toThrow("Translation provider returned null");
    });
  });

  describe("data mutation", () => {
    it("returns translated data without mutating original sourceData", async () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
      ];
      const sourceData = { title: "Hello" };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
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
        { localized: true, name: "title", type: "text" },
        { localized: false, name: "slug", type: "text" },
        { localized: false, name: "order", type: "number" },
      ];
      const sourceData = { order: 1, slug: "hello", title: "Hello" };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result!.translatedData).toEqual({
        order: 1,
        slug: "hello",
        title: "TR_Hello",
      });
    });

    it("preserves existing target non-localized values", async () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        { localized: false, name: "slug", type: "text" },
      ];
      const sourceData = { slug: "hello", title: "Hello" };
      const targetData = { slug: "other-slug", title: "" };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result!.translatedData).toEqual({
        slug: "other-slug",
        title: "TR_Hello",
      });
    });

    it("preserves existing target values with SkipExisting", async () => {
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
        slug: "other",
        title: "Translated",
      };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new SkipExistingStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result!.translatedData).toEqual({
        description: "TR_World",
        slug: "other",
        title: "Translated",
      });
    });
  });

  describe("nested structures with strategy", () => {
    it("applies SkipExisting to nested array fields", async () => {
      const schema: Field[] = [
        {
          fields: [{ name: "label", type: "text", localized: true }],
          name: "items",
          type: "array",
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
        translationStrategy: new SkipExistingStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      // Note: id is not included in result - Postgres rejects it on update
      expect(result!.translatedData.items).toEqual([
        { label: "Translated" },
        { label: "TR_Second" },
      ]);
    });

    it("applies SkipExisting to nested group fields", async () => {
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
      const sourceData = { meta: { description: "World", title: "Hello" } };
      const targetData = { meta: { description: "", title: "Translated" } };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new SkipExistingStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result!.translatedData.meta).toEqual({
        description: "TR_World",
        title: "Translated",
      });
    });

    it("applies SkipExisting to blocks fields", async () => {
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

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new SkipExistingStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      // Note: id is not included in result - Postgres rejects it on update
      expect(result!.translatedData.layout).toEqual([
        { blockType: "text", content: "Translated" },
        { blockType: "text", content: "TR_World" },
      ]);
    });
  });

  describe("translateKit.exclude handling", () => {
    it("skips excluded fields from translation", async () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        {
          custom: { translateKit: { exclude: true } },
          localized: true,
          name: "sku",
          type: "text",
        },
      ];
      const sourceData = { sku: "SKU-123", title: "Hello" };
      const targetData = { sku: "SKU-456" };

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result!.translatedData.title).toBe("TR_Hello");
      expect(result!.translatedData.sku).toBe("SKU-456");
    });

    it("uses source value for excluded fields when target is empty", async () => {
      const schema: Field[] = [
        { localized: true, name: "title", type: "text" },
        {
          custom: { translateKit: { exclude: true } },
          localized: true,
          name: "sku",
          type: "text",
        },
      ];
      const sourceData = { sku: "SKU-123", title: "Hello" };
      const targetData = {};

      const provider = createMockProvider();
      const pipeline = new TranslationPipeline({
        translationProvider: provider,
        translationStrategy: new OverwriteStrategy(),
      });

      const result = await pipeline.execute({
        schema,
        sourceData,
        sourceLng: "en",
        targetData,
        targetLng: "ru",
      });

      expect(result!.translatedData.title).toBe("TR_Hello");
      expect(result!.translatedData.sku).toBe("SKU-123");
    });
  });
});
