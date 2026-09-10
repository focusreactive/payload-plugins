import { describe, it, expect } from "vitest";
import type { Field } from "payload";

import type { TranslationProvider } from "../domain/translation-providers";
import { computeSourceFingerprint } from "../domain/content-projection/computeSourceFingerprint";
import { translateContent } from "./translateContent";

// Deterministic fake provider: prefixes each collected text chunk with "T:".
// Preserves the numeric keys, as the contract requires.
const fakeProvider: TranslationProvider = {
  translate: async (input) => {
    const out: Record<number, string> = {};
    for (const key of Object.keys(input)) {
      out[Number(key)] = `T:${input[Number(key)]}`;
    }
    return out;
  },
};

const run = (schema: Field[], sourceData: Record<string, unknown>) =>
  translateContent({
    schema,
    sourceData,
    sourceLng: "en",
    targetLng: "de",
    translationProvider: fakeProvider,
  });

const richTextNode = (value: string) => ({
  type: "text",
  text: value,
  format: 0,
  detail: 0,
  mode: "normal",
  style: "",
  version: 1,
});

const richTextValue = (values: string[]) => ({
  root: {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: values.map(richTextNode),
        format: "",
        indent: 0,
        version: 1,
        direction: "ltr",
      },
    ],
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
  },
});

const richSchema: Field[] = [{ name: "body", type: "richText", localized: true }];

describe("translateContent", () => {
  it("translates a localized leaf field", async () => {
    const result = await run([{ name: "title", type: "text", localized: true }], {
      title: "hello",
    });
    expect(result).toEqual({ title: "T:hello" });
  });

  it("translates localized leaves inside a group wrapper, leaving non-localized values intact", async () => {
    const schema: Field[] = [
      {
        name: "hero",
        type: "group",
        fields: [
          { name: "heading", type: "text", localized: true },
          { name: "sku", type: "text" }, // non-localized → not translated, preserved
        ],
      },
    ];
    const result = await run(schema, {
      hero: { heading: "hi", sku: "ABC-123" },
    });
    expect(result).toEqual({ hero: { heading: "T:hi", sku: "ABC-123" } });
  });

  it("translates localized leaves inside array items", async () => {
    const schema: Field[] = [
      {
        name: "items",
        type: "array",
        fields: [{ name: "label", type: "text", localized: true }],
      },
    ];
    const result = await run(schema, {
      items: [{ label: "a" }, { label: "b" }],
    });
    expect(result).toEqual({ items: [{ label: "T:a" }, { label: "T:b" }] });
  });

  it("translates localized leaves inside blocks", async () => {
    const schema: Field[] = [
      {
        name: "layout",
        type: "blocks",
        blocks: [
          {
            slug: "cta",
            fields: [{ name: "text", type: "text", localized: true }],
          },
        ],
      },
    ];
    const result = await run(schema, {
      layout: [{ blockType: "cta", text: "click" }],
    });
    expect(result).toEqual({ layout: [{ blockType: "cta", text: "T:click" }] });
  });

  it("returns null when nothing is translatable (no localized leaves)", async () => {
    const result = await run([{ name: "sku", type: "text" }], { sku: "ABC" });
    expect(result).toBeNull();
  });

  it("respects skip_existing: keeps a non-empty target value", async () => {
    const result = await translateContent({
      schema: [{ name: "title", type: "text", localized: true }],
      sourceData: { title: "hello" },
      targetData: { title: "bereits übersetzt" },
      sourceLng: "en",
      targetLng: "de",
      translationProvider: fakeProvider,
      strategy: "skip_existing",
    });
    expect(result).toBeNull(); // nothing to translate — target already filled
  });

  it("respects skip_existing: translates when target is empty", async () => {
    const result = await translateContent({
      schema: [{ name: "title", type: "text", localized: true }],
      sourceData: { title: "hello" },
      targetData: {},
      sourceLng: "en",
      targetLng: "de",
      translationProvider: fakeProvider,
      strategy: "skip_existing",
    });
    expect(result).toEqual({ title: "T:hello" });
  });

  describe("the caller's source document", () => {
    it("is unchanged after a plain-text translation", async () => {
      const sourceData = { title: "hello" };
      const before = structuredClone(sourceData);

      await run([{ name: "title", type: "text", localized: true }], sourceData);

      expect(sourceData).toEqual(before);
    });

    it("is unchanged after a rich-text translation", async () => {
      const sourceData = { body: richTextValue(["Hello ", "world"]) };
      const before = structuredClone(sourceData);

      const result = await run(richSchema, sourceData);

      // Both halves: without the second, a pipeline that translated nothing would pass.
      expect(sourceData).toEqual(before);
      expect(result).not.toEqual(before);
    });

    it("leaves the source fingerprint identical either side of a translation", async () => {
      const sourceData = { body: richTextValue(["Hello ", "world"]) };
      const before = computeSourceFingerprint(sourceData, richSchema);

      await run(richSchema, sourceData);

      expect(computeSourceFingerprint(sourceData, richSchema)).toBe(before);
    });

    it("shares no object with the translated result", async () => {
      const sourceData = { body: richTextValue(["Hello "]) };
      const sourceNode = sourceData.body.root.children[0]?.children[0];

      const result = await run(richSchema, sourceData);
      const resultBody = (result as { body: { root: { children: { children: unknown[] }[] } } })
        .body;

      expect(resultBody.root.children[0]?.children[0]).not.toBe(sourceNode);
      expect(resultBody.root).not.toBe(sourceData.body.root);
    });
  });
});
