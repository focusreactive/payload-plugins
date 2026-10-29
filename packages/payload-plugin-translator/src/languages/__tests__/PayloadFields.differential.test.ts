import { describe, expect, it } from "vitest";

import { applyTranslations, collectTranslationTargets } from "../../core/traversal/index.js";
import type { FieldLike } from "../../core/kernel/field-traversal/index.js";
import { addressesOf } from "./addresses.js";
import { FieldChunkCollector } from "../../core/translation-pipeline/stages/field-collector/index.js";
import { projectTranslatableContent } from "../../core/domain/content-projection/contentProjector.js";
import { DataReconciler } from "../../core/translation-pipeline/stages/data-reconciler/index.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../PayloadFields.language.js";

type Doc = Record<string, unknown>;
type Walked = { texts: unknown[]; addresses: string[]; document: Doc };

const translated = (text: unknown): string => `[de] ${String(text)}`;

const viaCollector = (schema: FieldLike[], document: Doc, data?: Doc): Walked => {
  const working = data ?? structuredClone(document);
  const chunks = new FieldChunkCollector(
    schema,
    working,
    document,
    projectTranslatableContent(document, schema).map((entry) => String(entry.idPath))
  ).collect();

  const texts = chunks.map((chunk) => chunk.dataRef[chunk.key]);
  for (const chunk of chunks) chunk.dataRef[chunk.key] = translated(chunk.dataRef[chunk.key]);

  return { texts, addresses: chunks.map((chunk) => String(chunk.idPath)), document: working };
};

const viaLanguage = (schema: FieldLike[], document: Doc, data?: Doc): Walked => {
  const working = data ?? structuredClone(document);
  const targets = collectTranslationTargets({
    languages: [payloadFieldsLanguage()],
    entry: {
      languageId: PAYLOAD_FIELDS_ID,
      context: { fields: schema, data: working, source: document },
    },
  });

  const texts = targets.map((target) => target.text);
  applyTranslations(
    targets,
    targets.map((target) => translated(target.text))
  );

  return { texts, addresses: addressesOf(targets), document: working };
};

const CASES: { name: string; schema: FieldLike[]; document: Doc }[] = [
  {
    name: "plain fields, with a non-localized and an empty sibling",
    schema: [
      { type: "text", name: "title", localized: true },
      { type: "textarea", name: "body", localized: true },
      { type: "text", name: "slug" },
      { type: "text", name: "blank", localized: true },
      { type: "number", name: "count", localized: true },
    ],
    document: { title: "Hello", body: "World", slug: "hello", blank: "   ", count: 3 },
  },
  {
    name: "a field excluded through its own config",
    schema: [
      { type: "text", name: "kept", localized: true },
      {
        type: "text",
        name: "secret",
        localized: true,
        custom: { translateKit: { exclude: true } },
      },
    ],
    document: { kept: "Keep", secret: "Hide" },
  },
  {
    name: "a group",
    schema: [
      {
        type: "group",
        name: "meta",
        fields: [{ type: "text", name: "caption", localized: true }],
      },
    ],
    document: { meta: { caption: "Caption" } },
  },
  {
    name: "a row, which opens no level of its own",
    schema: [
      { type: "row", fields: [{ type: "text", name: "kicker", localized: true }] },
      { type: "text", name: "after", localized: true },
    ],
    document: { kicker: "Kicker", after: "After" },
  },
  {
    name: "named and unnamed tabs",
    schema: [
      {
        type: "tabs",
        tabs: [
          { name: "seo", fields: [{ type: "text", name: "metaTitle", localized: true }] },
          { fields: [{ type: "text", name: "loose", localized: true }] },
        ],
      },
    ],
    document: { seo: { metaTitle: "Meta" }, loose: "Loose" },
  },
  {
    name: "an array whose elements carry ids",
    schema: [
      {
        type: "array",
        name: "items",
        fields: [{ type: "text", name: "label", localized: true }],
      },
    ],
    document: {
      items: [
        { id: "a", label: "First" },
        { id: "b", label: "Second" },
      ],
    },
  },
  {
    name: "an array whose elements carry no id, so position is the fallback",
    schema: [
      {
        type: "array",
        name: "items",
        fields: [{ type: "text", name: "label", localized: true }],
      },
    ],
    document: { items: [{ label: "First" }, { label: "Second" }] },
  },
  {
    name: "blocks, with the type folded into the address",
    schema: [
      {
        type: "blocks",
        name: "sections",
        blocks: [
          { slug: "hero", fields: [{ type: "text", name: "heading", localized: true }] },
          { slug: "quote", fields: [{ type: "text", name: "quote", localized: true }] },
        ],
      },
    ],
    document: {
      sections: [
        { id: "s1", blockType: "hero", heading: "Hi" },
        { id: "s2", blockType: "quote", quote: "Quoted" },
      ],
    },
  },
  {
    name: "a block element naming a type nobody declared",
    schema: [
      {
        type: "blocks",
        name: "sections",
        blocks: [{ slug: "hero", fields: [{ type: "text", name: "heading", localized: true }] }],
      },
    ],
    document: {
      sections: [
        { id: "s1", blockType: "hero", heading: "Hi" },
        { id: "s2", blockType: "nobody-declared-this", heading: "Lost" },
      ],
    },
  },
  {
    name: "names and ids carrying the characters the address grammar escapes",
    schema: [
      {
        type: "blocks",
        name: "od.d:name",
        blocks: [{ slug: "he#ro", fields: [{ type: "text", name: "head.ing", localized: true }] }],
      },
    ],
    document: { "od.d:name": [{ id: "a:b.c#d", blockType: "he#ro", "head.ing": "Odd" }] },
  },
  {
    name: "nesting: a group inside a block inside an array",
    schema: [
      {
        type: "array",
        name: "rows",
        fields: [
          {
            type: "blocks",
            name: "cells",
            blocks: [
              {
                slug: "box",
                fields: [
                  {
                    type: "group",
                    name: "inner",
                    fields: [{ type: "text", name: "deep", localized: true }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    document: {
      rows: [{ id: "r1", cells: [{ id: "c1", blockType: "box", inner: { deep: "Deep" } }] }],
    },
  },
];

describe("the field language agrees with the collector it replaces", () => {
  it.each(CASES.map((c) => [c.name, c] as const))("%s — same text, in order", (_n, testCase) => {
    const old = viaCollector(testCase.schema, testCase.document);
    const next = viaLanguage(testCase.schema, testCase.document);

    expect(next.texts).toEqual(old.texts);
  });

  it.each(CASES.map((c) => [c.name, c] as const))("%s — same addresses", (_n, testCase) => {
    const old = viaCollector(testCase.schema, testCase.document);
    const next = viaLanguage(testCase.schema, testCase.document);

    expect(next.addresses).toEqual(old.addresses);
  });

  it.each(CASES.map((c) => [c.name, c] as const))("%s — same document after writing", (_n, tc) => {
    const old = viaCollector(tc.schema, tc.document);
    const next = viaLanguage(tc.schema, tc.document);

    expect(next.document).toEqual(old.document);
  });

  it("the comparison is not vacuous — the collector finds something in every case", () => {
    for (const testCase of CASES) {
      expect(viaCollector(testCase.schema, testCase.document).texts.length).toBeGreaterThan(0);
    }
  });
});

/**
 * The shapes above all hand the walk a copy of the source. Production does not: the working copy
 * comes out of the reconciler, which strips ids from per-locale rows, seats existing translations
 * in the leaves, and passes unknown elements through raw. The language reads ids and text from the
 * source, so those differences must not move the result — and nothing above would notice if they
 * started to.
 */
const RECONCILED: { name: string; schema: FieldLike[]; source: Doc; target: Doc }[] = [
  {
    name: "leaves already holding a translation",
    schema: [
      { type: "text", name: "title", localized: true },
      { type: "text", name: "subtitle", localized: true },
    ],
    source: { title: "Hello", subtitle: "World" },
    target: { title: "Hallo" },
  },
  {
    name: "a localized array, whose per-locale rows lose their ids",
    schema: [
      {
        type: "array",
        name: "items",
        localized: true,
        fields: [{ type: "text", name: "label", localized: true }],
      },
    ],
    source: {
      items: [
        { id: "a", label: "First" },
        { id: "b", label: "Second" },
      ],
    },
    target: { items: [{ id: "x", label: "Erste" }] },
  },
  {
    name: "a non-localized array, whose rows are shared and keep their ids",
    schema: [
      {
        type: "array",
        name: "items",
        fields: [{ type: "text", name: "label", localized: true }],
      },
    ],
    source: {
      items: [
        { id: "a", label: "First" },
        { id: "b", label: "Second" },
      ],
    },
    target: { items: [{ id: "a", label: "Erste" }] },
  },
  {
    name: "a named tab the target has nothing for",
    schema: [
      {
        type: "tabs",
        tabs: [{ name: "seo", fields: [{ type: "text", name: "metaTitle", localized: true }] }],
      },
    ],
    source: { seo: { metaTitle: "Meta" } },
    target: {},
  },
  {
    name: "blocks where one element names no type at all",
    schema: [
      {
        type: "blocks",
        name: "sections",
        blocks: [{ slug: "hero", fields: [{ type: "text", name: "heading", localized: true }] }],
      },
    ],
    source: {
      sections: [
        { id: "s1", blockType: "hero", heading: "Hi" },
        { id: "s2", heading: "No type" },
      ],
    },
    target: {},
  },
];

describe("the same agreement, on the shape the pipeline actually produces", () => {
  const reconciled = (testCase: (typeof RECONCILED)[number]) =>
    new DataReconciler(testCase.schema).reconcile(testCase.source, testCase.target);

  it.each(RECONCILED.map((c) => [c.name, c] as const))("%s — same text", (_n, testCase) => {
    const old = viaCollector(testCase.schema, testCase.source, reconciled(testCase));
    const next = viaLanguage(testCase.schema, testCase.source, reconciled(testCase));

    expect(next.texts).toEqual(old.texts);
  });

  it.each(RECONCILED.map((c) => [c.name, c] as const))("%s — same addresses", (_n, testCase) => {
    const old = viaCollector(testCase.schema, testCase.source, reconciled(testCase));
    const next = viaLanguage(testCase.schema, testCase.source, reconciled(testCase));

    expect(next.addresses).toEqual(old.addresses);
  });

  it.each(RECONCILED.map((c) => [c.name, c] as const))("%s — same document", (_n, testCase) => {
    const old = viaCollector(testCase.schema, testCase.source, reconciled(testCase));
    const next = viaLanguage(testCase.schema, testCase.source, reconciled(testCase));

    expect(next.document).toEqual(old.document);
  });

  it("the working copy is not the source: the localized rows have lost their ids", () => {
    const localizedArray = RECONCILED[1];
    const data = reconciled(localizedArray) as { items: Record<string, unknown>[] };

    expect(data.items.map((row) => row.id)).toEqual([undefined, undefined]);
  });

  it("the working copy is not the source: a shared row keeps the id the address needs", () => {
    const sharedArray = RECONCILED[2];
    const data = reconciled(sharedArray) as { items: Record<string, unknown>[] };

    expect(data.items.map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("the working copy is not the source: a leaf already carries the target text", () => {
    const alreadyTranslated = RECONCILED[0];
    const data = reconciled(alreadyTranslated) as Record<string, unknown>;

    expect(data.title).toBe("Hallo");
    expect(alreadyTranslated.source.title).toBe("Hello");
  });
});
