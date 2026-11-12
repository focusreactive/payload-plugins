import { translationLanguages } from "../../server/features/_lib/translationLanguages.js";
import { describe, it, expect } from "vitest";
import type { Field } from "payload";

import type {
  TranslationOutput,
  TranslationProvider,
  TranslationRequest,
} from "../../core/domain/translation-providers/index.js";
import { fingerprintsOf } from "../../server/modules/provenance/__tests__/fixtures/fingerprinter.js";
import { translateContent } from "../../core/translation-pipeline/translateContent.js";
import type { TranslateContentArgs } from "../../core/translation-pipeline/translateContent.js";
import { everySelectableAddress } from "./fixtures/selection.js";

const translateAll = (
  args: Omit<TranslateContentArgs, "selection" | "languages" | "hostLanguageId">
) =>
  translateContent({
    ...args,
    selection: everySelectableAddress(args.sourceData, args.schema),
    ...translationLanguages(),
  });

const fakeProvider: TranslationProvider = {
  translate: async (input) => {
    const out: TranslationOutput = {};
    for (const [key, value] of Object.entries(input)) {
      out[Number(key)] =
        value.kind === "text"
          ? { kind: "text", text: `T:${value.text}` }
          : {
              kind: "segments",
              segments: value.segments.map((s) => ({ id: s.id, text: `T:${s.text ?? ""}` })),
            };
    }
    return out;
  },
};

const recordingProvider = (): { provider: TranslationProvider; seen: TranslationRequest[] } => {
  const seen: TranslationRequest[] = [];

  return {
    seen,
    provider: {
      translate: async (input, request) => {
        seen.push(request);
        return Object.fromEntries(
          Object.keys(input).map((key) => [key, { kind: "text", text: "x" } as const])
        );
      },
    },
  };
};

describe("what the provider is told about the request", () => {
  const schema = [{ name: "title", type: "text", localized: true }] as Field[];

  it("names the document when the caller has one", async () => {
    const { provider, seen } = recordingProvider();

    await translateAll({
      document: { collection: "machines", id: "7" },
      schema,
      sourceData: { title: "Home" },
      sourceLng: "en",
      targetLng: "de",
      translationProvider: provider,
    });

    expect(seen[0]).toMatchObject({ document: { collection: "machines", id: "7" } });
  });
});

const runResult = async (schema: Field[], sourceData: Record<string, unknown>) =>
  await translateAll({
    document: { collection: "docs", id: "1" },
    schema,
    sourceData,
    sourceLng: "en",
    targetLng: "de",
    translationProvider: fakeProvider,
  });

const run = async (schema: Field[], sourceData: Record<string, unknown>) => {
  const result = await runResult(schema, sourceData);
  return result.sent ? result.translatedData : null;
};

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

  it("sends nothing when nothing is translatable (no localized leaves)", async () => {
    const result = await runResult([{ name: "sku", type: "text" }], { sku: "ABC" });
    expect(result).toEqual({ sent: false });
  });

  it("sends nothing when the selection is empty, whatever the target holds", async () => {
    const result = await translateContent({
      document: { collection: "docs", id: "1" },
      schema: [{ name: "title", type: "text", localized: true }],
      sourceData: { title: "hello" },
      targetData: { title: "bereits übersetzt" },
      sourceLng: "en",
      targetLng: "de",
      translationProvider: fakeProvider,
      selection: [],
      ...translationLanguages(),
    });
    expect(result).toEqual({ sent: false });
  });

  it("translates a named leaf over a target that already holds text", async () => {
    const result = await translateContent({
      document: { collection: "docs", id: "1" },
      schema: [{ name: "title", type: "text", localized: true }],
      sourceData: { title: "hello" },
      targetData: { title: "bereits übersetzt" },
      sourceLng: "en",
      targetLng: "de",
      translationProvider: fakeProvider,
      selection: ["title"],
      ...translationLanguages(),
    });
    expect(result).toEqual({
      sent: true,
      translatedData: { title: "T:hello" },
      leaves: [{ idPath: "title", answered: true }],
    });
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

    it("is unchanged after a rich-text translation in container mode", async () => {
      const sourceData = { body: richTextValue(["Hello ", "world"]) };
      const before = structuredClone(sourceData);

      const marksProvider: TranslationProvider = {
        translate: async () => ({
          0: {
            kind: "segments",
            segments: [
              { id: 2, text: "Welt" },
              { id: 1, text: "Hallo " },
            ],
          },
        }),
      };

      const result = await translateAll({
        document: { collection: "docs", id: "1" },
        schema: richSchema,
        sourceData,
        sourceLng: "en",
        targetLng: "de",
        translationProvider: marksProvider,
      });

      expect(sourceData).toEqual(before);
      expect(result).not.toEqual(before);
    });

    it("leaves the source fingerprint identical either side of a translation", async () => {
      const sourceData = { body: richTextValue(["Hello ", "world"]) };
      const fingerprintOf = fingerprintsOf({ get: () => richSchema });
      const before = fingerprintOf("posts", sourceData);

      await run(richSchema, sourceData);

      expect(fingerprintOf("posts", sourceData)).toEqual(before);
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
