import { describe, expect, it } from "vitest";

import baseline from "./fixtures/fields.baseline.json" with { type: "json" };

import { applyTranslations, collectTranslationTargets } from "../../../core/traversal/index.js";
import type { FieldLike } from "../../../core/kernel/field-traversal/index.js";
import { addressesOf, addressOf } from "../../__tests__/addresses.js";
import { DataReconciler } from "../../../core/translation-pipeline/stages/data-reconciler/index.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../PayloadFields.language.js";
import { sentTextOf, sentTextsOf } from "../../../core/traversal/__tests__/fixtures/sentText.js";

type Doc = Record<string, unknown>;
type Walked = { texts: unknown[]; addresses: string[]; document: Doc };

const translated = (text: unknown): string => `[de] ${String(text)}`;

/**
 * Recorded from the collector this language replaces, while it still existed: regenerating it from
 * the walk would leave nothing to compare against.
 */
const viaCollector = (
  schema: FieldLike[],
  document: Doc,
  data?: Doc,
  selection?: readonly string[]
): Walked => {
  const recorded = (baseline as Record<string, Walked | undefined>)[
    JSON.stringify([schema, document, data, selection])
  ];
  if (recorded === undefined) throw new Error("no recorded baseline for this document");
  return recorded;
};

const viaLanguage = (
  schema: FieldLike[],
  document: Doc,
  data?: Doc,
  selection?: readonly string[]
): Walked => {
  const working = data ?? structuredClone(document);
  const collected = collectTranslationTargets({
    languages: [payloadFieldsLanguage()],
    entry: {
      languageId: PAYLOAD_FIELDS_ID,
      context: { fields: schema, data: working, source: document },
    },
  });

  const wanted = selection === undefined ? null : new Set(selection);
  const chosen = collected.targets.filter(
    (target) => wanted === null || wanted.has(addressOf(target.foldPath))
  );

  const texts = sentTextsOf(chosen);
  applyTranslations(
    { ...collected, targets: chosen },
    chosen.map((target) => translated(sentTextOf(target)))
  );

  return { texts, addresses: addressesOf(chosen), document: working };
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

const NARROWED: {
  name: string;
  schema: FieldLike[];
  document: Doc;
  target: Doc;
  selection: readonly string[];
}[] = [
  {
    name: "one field of several",
    schema: [
      { type: "text", name: "title", localized: true },
      { type: "text", name: "subtitle", localized: true },
      { type: "textarea", name: "body", localized: true },
    ],
    document: { title: "Hello", subtitle: "Second", body: "World" },
    target: { title: "Hallo", subtitle: "Zweite", body: "Welt" },
    selection: ["body"],
  },
  {
    name: "nothing at all, which must write nothing",
    schema: [{ type: "text", name: "title", localized: true }],
    document: { title: "Hello" },
    target: { title: "Hallo" },
    selection: [],
  },
  {
    name: "one row of an array, named by its id",
    schema: [
      {
        type: "array",
        name: "items",
        localized: true,
        fields: [{ type: "text", name: "label", localized: true }],
      },
    ],
    document: {
      items: [
        { id: "a", label: "First" },
        { id: "b", label: "Second" },
      ],
    },
    target: {
      items: [
        { id: "a", label: "Erste" },
        { id: "b", label: "Zweite" },
      ],
    },
    selection: ["items.a.label"],
  },
  {
    name: "a field inside a block, leaving its sibling block alone",
    schema: [
      {
        type: "blocks",
        name: "sections",
        localized: true,
        blocks: [{ slug: "copy", fields: [{ type: "text", name: "heading", localized: true }] }],
      },
    ],
    document: {
      sections: [
        { id: "s1", blockType: "copy", heading: "One" },
        { id: "s2", blockType: "copy", heading: "Two" },
      ],
    },
    target: {
      sections: [
        { id: "s1", blockType: "copy", heading: "Eins" },
        { id: "s2", blockType: "copy", heading: "Zwei" },
      ],
    },
    selection: ["sections.s2:copy.heading"],
  },
];

describe("a run narrowed to some fields, into a target that already holds text", () => {
  it.each(NARROWED.map((c) => [c.name, c] as const))("%s — same text, in order", (_n, testCase) => {
    const old = viaCollector(
      testCase.schema,
      testCase.document,
      structuredClone(testCase.target),
      testCase.selection
    );
    const next = viaLanguage(
      testCase.schema,
      testCase.document,
      structuredClone(testCase.target),
      testCase.selection
    );

    expect(next.texts).toEqual(old.texts);
  });

  it.each(NARROWED.map((c) => [c.name, c] as const))("%s — same addresses", (_n, testCase) => {
    const old = viaCollector(
      testCase.schema,
      testCase.document,
      structuredClone(testCase.target),
      testCase.selection
    );
    const next = viaLanguage(
      testCase.schema,
      testCase.document,
      structuredClone(testCase.target),
      testCase.selection
    );

    expect(next.addresses).toEqual(old.addresses);
  });

  it.each(NARROWED.map((c) => [c.name, c] as const))(
    "%s — same tree after writing",
    (_n, testCase) => {
      const old = viaCollector(
        testCase.schema,
        testCase.document,
        structuredClone(testCase.target),
        testCase.selection
      );
      const next = viaLanguage(
        testCase.schema,
        testCase.document,
        structuredClone(testCase.target),
        testCase.selection
      );

      expect(next.document).toEqual(old.document);
    }
  );

  it("the comparison is not vacuous — a narrowed run really does send less", () => {
    const [narrowed] = NARROWED;
    if (!narrowed) throw new Error("no narrowed case");
    const all = viaCollector(narrowed.schema, narrowed.document, structuredClone(narrowed.target));
    const some = viaCollector(
      narrowed.schema,
      narrowed.document,
      structuredClone(narrowed.target),
      narrowed.selection
    );

    expect(some.texts.length).toBeGreaterThan(0);
    expect(some.texts.length).toBeLessThan(all.texts.length);
  });
});
