import { describe, expect, it } from "vitest";

import baseline from "./fixtures/lexical.baseline.json" with { type: "json" };

import {
  UNWRITABLE_MARKERS,
  answerInKind,
  sentOf,
  sentTextOf,
} from "../../../traversal/__tests__/fixtures/sentText.js";
import { applyTranslations } from "../../../traversal/index.js";
import type { TranslationTarget } from "../../../traversal/index.js";
import type { BlockLike, FieldLike } from "../../../core/kernel/field-traversal/index.js";
import { addressesOf } from "../../__tests__/addresses.js";
import type { Doc } from "../../__tests__/fixtures/lexical.js";
import {
  block,
  claimsNothing,
  dig,
  element,
  inlineBlock,
  paragraph,
  text,
  translated,
  tree,
  walkDocument,
  walkTree,
} from "../../__tests__/fixtures/lexical.js";

type Compared = { texts: string[]; addresses: string[]; document: Doc };

const sentBy = (target: TranslationTarget): string => sentOf(target, UNWRITABLE_MARKERS);

const answerFor = (target: TranslationTarget) => answerInKind(target, translated);

/**
 * Recorded from the pipeline this language replaces, while it still existed: regenerating it from
 * the walk would leave nothing to compare against.
 */
const viaPipeline = (schema: FieldLike[], source: Doc, target?: Doc): Compared => {
  const recorded = (baseline as Record<string, Compared | undefined>)[
    JSON.stringify([schema, source, target])
  ];
  if (recorded === undefined) throw new Error("no recorded baseline for this document");
  return recorded;
};

const viaLanguage = (
  schema: FieldLike[],
  source: Doc,
  blocks: readonly BlockLike[],
  target?: Doc
): Compared => {
  const { collected, working } = walkDocument({
    schema,
    source,
    target,
    blocks,
    inlineBlocks: blocks,
  });
  const texts = collected.targets.map(sentBy);
  applyTranslations(collected, collected.targets.map(answerFor));
  return { texts, addresses: addressesOf(collected.targets), document: working };
};

const body: FieldLike[] = [{ type: "richText", name: "body", localized: true }];

type Case = { name: string; schema: FieldLike[]; document: Doc; blocks?: BlockLike[] };

const ctaDefinition: BlockLike = {
  slug: "cta",
  fields: [{ type: "text", name: "heading", localized: true }],
};

const sectionBlock: BlockLike = {
  slug: "section",
  fields: [
    { type: "text", name: "title", localized: true },
    { type: "richText", name: "content", localized: true },
  ],
};

const CASES: Case[] = [
  {
    name: "one paragraph of prose",
    schema: body,
    document: { body: tree(paragraph(text("Hello world"))) },
  },
  {
    name: "text nodes carrying surrounding whitespace",
    schema: body,
    document: {
      body: tree(paragraph(text("  Leading"), text("trailing  "), text(" both "))),
    },
  },
  {
    name: "a whitespace-only and an empty text node between two with text",
    schema: body,
    document: { body: tree(paragraph(text("One"), text("   "), text(""), text("Two"))) },
  },
  {
    name: "a link, which carries host fields of its own and children to descend into",
    schema: body,
    document: {
      body: tree(
        paragraph(
          text("Read "),
          {
            type: "link",
            version: 1,
            fields: { url: "/docs", newTab: false, linkType: "custom" },
            children: [text("the docs")],
          },
          text(" today")
        )
      ),
    },
  },
  {
    name: "an upload, which carries host fields and no children",
    schema: body,
    document: {
      body: tree(
        paragraph(text("Above")),
        { type: "upload", version: 3, fields: { caption: "A photo", value: 42 } },
        paragraph(text("Below"))
      ),
    },
  },
  {
    name: "prose nested in a heading, a quote, a link and a list inside a list",
    schema: body,
    document: {
      body: tree(
        element("heading", text("Title")),
        paragraph(text("See "), element("link", text("the docs")), text(" now.")),
        element("quote", text("Quoted")),
        element(
          "list",
          element("listitem", text("Outer")),
          element("listitem", element("list", element("listitem", text("Inner"))))
        ),
        paragraph(text("End"))
      ),
    },
  },
  {
    name: "nodes that carry text without being text nodes",
    schema: body,
    document: {
      body: tree(
        paragraph(text("Before"), { type: "linebreak", version: 1 }, text("After")),
        paragraph(text("Indent"), { type: "tab", version: 1, text: "\t" }),
        element("code", { type: "code-highlight", version: 1, text: "const x = 1;" })
      ),
    },
  },
  {
    name: "two rich-text fields with a plain field between them",
    schema: [
      { type: "richText", name: "intro", localized: true },
      { type: "text", name: "title", localized: true },
      { type: "richText", name: "body", localized: true },
    ],
    document: {
      intro: tree(paragraph(text("Intro one"), text("Intro two"))),
      title: "A title",
      body: tree(paragraph(text("Body"))),
    },
  },
  {
    name: "a rich-text field inside a group",
    schema: [
      {
        type: "group",
        name: "meta",
        fields: [{ type: "richText", name: "summary", localized: true }],
      },
    ],
    document: { meta: { summary: tree(paragraph(text("Summary"))) } },
  },
  {
    name: "a rich-text field inside a host block element",
    schema: [
      {
        type: "blocks",
        name: "sections",
        blocks: [{ slug: "hero", fields: [{ type: "richText", name: "copy", localized: true }] }],
      },
    ],
    document: {
      sections: [{ id: "s1", blockType: "hero", copy: tree(paragraph(text("Hero copy"))) }],
    },
  },
  {
    name: "a rich-text field whose name the address grammar escapes",
    schema: [{ type: "richText", name: "bo.dy#1:x", localized: true }],
    document: { "bo.dy#1:x": tree(paragraph(text("Odd name"))) },
  },
  {
    name: "a non-localized rich-text field beside a localized one",
    schema: [
      { type: "richText", name: "shared", localized: false },
      { type: "richText", name: "body", localized: true },
    ],
    document: {
      shared: tree(paragraph(text("Not mine to translate"))),
      body: tree(paragraph(text("Mine"))),
    },
  },
  {
    name: "embeds nobody listed, which the old pipeline passes over too",
    schema: body,
    blocks: [{ slug: "listed", fields: [{ type: "text", name: "heading", localized: true }] }],
    document: {
      body: tree(
        paragraph(text("Before")),
        block({ id: "b1", blockType: "gallery", caption: "Caption" }),
        paragraph(
          text("Inline "),
          inlineBlock({ id: "i1", blockType: "mention", label: "Ada" }),
          text(" after")
        )
      ),
    },
  },
];

const EMPTY: Case[] = [
  { name: "an empty tree", schema: body, document: { body: tree() } },
  {
    name: "a tree holding only whitespace and an empty paragraph",
    schema: body,
    document: { body: tree(paragraph(text("   ")), paragraph()) },
  },
];

const ALL = [...CASES, ...EMPTY].map((testCase) => [testCase.name, testCase] as const);

describe("the lexical language agrees with the rich-text pipeline production runs", () => {
  it.each(ALL)("%s — same text, in order", (_n, testCase) => {
    const old = viaPipeline(testCase.schema, testCase.document);
    const next = viaLanguage(testCase.schema, testCase.document, testCase.blocks ?? []);

    expect(next.texts).toEqual(old.texts);
  });

  it.each(ALL)("%s — same address for every unit", (_n, testCase) => {
    const old = viaPipeline(testCase.schema, testCase.document);
    const next = viaLanguage(testCase.schema, testCase.document, testCase.blocks ?? []);

    expect(next.addresses).toEqual(old.addresses);
  });

  it.each(ALL)("%s — same tree after writing", (_n, testCase) => {
    const old = viaPipeline(testCase.schema, testCase.document);
    const next = viaLanguage(testCase.schema, testCase.document, testCase.blocks ?? []);

    expect(next.document).toEqual(old.document);
  });

  it("the comparison is not vacuous — the pipeline finds text in every non-empty case", () => {
    for (const testCase of CASES) {
      expect(viaPipeline(testCase.schema, testCase.document).texts.length).toBeGreaterThan(0);
    }
  });
});

describe("writing back", () => {
  it("same tree is written in place: the tree the context carries is the one that changes", () => {
    const handed = tree(paragraph(text("Hello")));
    applyTranslations(walkTree({ tree: handed, embed: claimsNothing }), ["Hallo"]);

    expect(dig(handed, "root", "children", 0, "children", 0, "text")).toBe("Hallo");
  });

  it("same tree left in the source: nothing is written into the document text is read from", () => {
    const source: Doc = { body: tree(paragraph(text("Hello"), text("World"))) };
    const before = structuredClone(source);

    const { collected } = walkDocument({ schema: body, source });
    applyTranslations(collected, collected.targets.map(answerFor));

    expect(source).toEqual(before);
  });

  it("same tree left in the source when the text sits inside embeds, two levels down", () => {
    const deep = tree(
      paragraph(text("Top")),
      block({
        id: "s1",
        blockType: "section",
        title: "Section title",
        content: tree(
          paragraph(text("Inner")),
          block({ id: "c1", blockType: "cta", heading: "Deep" })
        ),
      })
    );
    const source: Doc = { body: deep };
    const before = structuredClone(source);

    const { collected } = walkDocument({
      schema: body,
      source,
      blocks: [sectionBlock, ctaDefinition],
      inlineBlocks: [],
    });
    applyTranslations(
      collected,
      collected.targets.map((target) => translated(sentTextOf(target)))
    );

    expect(collected.targets.length).toBeGreaterThan(2);
    expect(source).toEqual(before);
  });
});

describe("a value with nothing to read", () => {
  it.each(EMPTY.map((testCase) => [testCase.name, testCase] as const))(
    "%s raises no alarm: nothing is selected-but-unreadable",
    (_n, testCase) => {
      expect(walkDocument({ schema: testCase.schema, source: testCase.document }).reported).toEqual(
        []
      );
    }
  );

  it("a whitespace-only node among prose raises no alarm either", () => {
    const source: Doc = { body: tree(paragraph(text("One"), text("   "), text("Two"))) };

    expect(walkDocument({ schema: body, source }).reported).toEqual([]);
  });
});

describe("a second run replaces whatever the target already held", () => {
  const schema: FieldLike[] = [{ type: "richText", name: "body", localized: true }];

  const source: Doc = {
    body: tree(paragraph(text("Intro")), paragraph(text("Outro"))),
  };

  const target: Doc = {
    body: tree(
      paragraph(text("Einleitung")),
      paragraph(text("Nur hier")),
      paragraph(text("Schluss"))
    ),
  };

  it("sends the source's text, not the target's", () => {
    const old = viaPipeline(schema, source, structuredClone(target));
    const next = viaLanguage(schema, source, [], structuredClone(target));

    expect(next.texts).toEqual(old.texts);
    expect(next.texts.join("")).toContain("Intro");
    expect(next.texts.join("")).not.toContain("Einleitung");
  });

  it("leaves the same tree behind, the target's own paragraph gone from both", () => {
    const old = viaPipeline(schema, source, structuredClone(target));
    const next = viaLanguage(schema, source, [], structuredClone(target));

    expect(next.document).toEqual(old.document);
    expect(JSON.stringify(next.document)).not.toContain("Nur hier");
  });

  it("does not touch the source the text was read from", () => {
    const before = structuredClone(source);
    viaLanguage(schema, source, [], structuredClone(target));

    expect(source).toEqual(before);
  });
});
