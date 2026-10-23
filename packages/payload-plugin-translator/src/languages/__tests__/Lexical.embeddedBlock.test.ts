import { describe, expect, it } from "vitest";

import { applyTranslations } from "../../core/traversal/index.js";
import type { Language } from "../../core/traversal/index.js";
import type { BlockLike, FieldLike } from "../../core/kernel/field-traversal/index.js";
import type { EmbedResolver } from "../richTextCrossing.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../PayloadFields.language.js";
import { addressesOf } from "./addresses.js";
import type { Doc, Node, Tree, Walked } from "./fixtures/lexical.js";
import {
  block,
  dig,
  inlineBlock,
  paragraph,
  text,
  translated,
  tree,
  walkDocument,
  walkTree,
} from "./fixtures/lexical.js";

const cta: BlockLike = {
  slug: "cta",
  fields: [{ type: "text", name: "heading", localized: true }],
};

const mention: BlockLike = {
  slug: "mention",
  fields: [{ type: "text", name: "label", localized: true }],
};

const section: BlockLike = {
  slug: "section",
  fields: [
    { type: "text", name: "title", localized: true },
    { type: "richText", name: "content", localized: true },
  ],
};

const link: BlockLike = {
  slug: "link",
  fields: [
    { type: "text", name: "label", localized: true },
    { type: "text", name: "href" },
  ],
};

const aside: BlockLike = {
  slug: "aside",
  fields: [
    { type: "text", name: "title", localized: true },
    { type: "richText", name: "notes" },
  ],
};

type Lists = { blocks: readonly BlockLike[]; inlineBlocks: readonly BlockLike[] };

const LISTED: Lists = { blocks: [cta, section, link, aside], inlineBlocks: [mention] };

const body: FieldLike[] = [{ type: "richText", name: "body", localized: true }];

const walk = (bodyTree: Tree, lists: Lists = LISTED): Walked =>
  walkDocument({ schema: body, source: { body: bodyTree }, ...lists });

const textsOf = (walked: Walked): string[] => walked.targets.map((target) => target.text);

const translateAll = (walked: Walked): Doc => {
  applyTranslations(
    walked.targets,
    walked.targets.map((target) => translated(target.text))
  );
  return walked.working;
};

const ctaBlock = (id: string, heading: string): Node =>
  block({ id, blockName: "", blockType: "cta", heading });

const anonymousCta = (heading: string): Node => block({ blockType: "cta", heading });

const anonymousMention = (label: string): Node => inlineBlock({ blockType: "mention", label });

const blockAmongProse = (): Tree =>
  tree(paragraph(text("Intro")), ctaBlock("b1", "Click me"), paragraph(text("Outro")));

const inlineInALine = (): Tree =>
  tree(
    paragraph(
      text("Before "),
      inlineBlock({ id: "i1", blockType: "mention", label: "Ada" }),
      text(" after")
    )
  );

const severalEmbeds = (): Tree =>
  tree(ctaBlock("b1", "First"), paragraph(text("Between")), ctaBlock("b2", "Second"));

const embedInsideEmbed = (): Tree =>
  tree(
    paragraph(text("Top")),
    block({
      id: "s1",
      blockName: "",
      blockType: "section",
      title: "Section title",
      content: tree(paragraph(text("Inner prose")), ctaBlock("c1", "Deep heading")),
    }),
    paragraph(text("Bottom"))
  );

describe("text inside an embed", () => {
  it("collects a block's leaf text, in document order among the prose", () => {
    expect(textsOf(walk(blockAmongProse()))).toEqual(["Intro", "Click me", "Outro"]);
  });

  it("collects an inline block's leaf text where it sits in its line", () => {
    expect(textsOf(walk(inlineInALine()))).toEqual(["Before ", "Ada", " after"]);
  });

  it("collects from every embed when one field holds several", () => {
    expect(textsOf(walk(severalEmbeds()))).toEqual(["First", "Between", "Second"]);
  });

  it("collects through two levels of nesting", () => {
    expect(textsOf(walk(embedInsideEmbed()))).toEqual([
      "Top",
      "Section title",
      "Inner prose",
      "Deep heading",
      "Bottom",
    ]);
  });

  it("collects and writes back into a block's own fields in the working copy", () => {
    const working = translateAll(walk(blockAmongProse()));

    expect(dig(working, "body", "root", "children", 1, "fields", "heading")).toBe("[de] Click me");
  });

  it("collects and writes back into an inline block's own fields", () => {
    const working = translateAll(walk(inlineInALine()));

    expect(dig(working, "body", "root", "children", 0, "children", 1, "fields", "label")).toBe(
      "[de] Ada"
    );
  });

  it("collects and writes back two levels down", () => {
    const working = translateAll(walk(embedInsideEmbed()));
    const inner = dig(working, "body", "root", "children", 1, "fields", "content");

    expect(dig(inner, "root", "children", 1, "fields", "heading")).toBe("[de] Deep heading");
  });

  it("collects and writes back the prose of a rich-text field inside an embed", () => {
    const working = translateAll(walk(embedInsideEmbed()));
    const inner = dig(working, "body", "root", "children", 1, "fields", "content");

    expect(dig(inner, "root", "children", 0, "children", 0, "text")).toBe("[de] Inner prose");
  });
});

describe("where embedded text is said to live", () => {
  it("addresses a block's leaf as <field>.<id>:<blockType>.<leaf>", () => {
    expect(addressesOf(walk(tree(ctaBlock("b1", "Click me"))).targets)).toEqual([
      "body.b1:cta.heading",
    ]);
  });

  it("addresses an inline block's leaf the same way", () => {
    const line = tree(paragraph(inlineBlock({ id: "i1", blockType: "mention", label: "Ada" })));

    expect(addressesOf(walk(line).targets)).toEqual(["body.i1:mention.label"]);
  });

  it("addresses the prose around an embed with the field's own address", () => {
    expect(addressesOf(walk(blockAmongProse()).targets)).toEqual([
      "body",
      "body.b1:cta.heading",
      "body",
    ]);
  });

  it("addresses each of several embeds by its own id", () => {
    const two = tree(ctaBlock("b1", "First"), ctaBlock("b2", "Second"));

    expect(addressesOf(walk(two).targets)).toEqual(["body.b1:cta.heading", "body.b2:cta.heading"]);
  });

  it("addresses an embed that declares no id by its ordinal among the field's embeds", () => {
    const two = tree(anonymousCta("First"), anonymousCta("Second"));

    expect(addressesOf(walk(two).targets)).toEqual(["body.#0.heading", "body.#1.heading"]);
  });

  it("keeps two id-less embeds apart when they sit under different parents", () => {
    const apart = tree(
      paragraph(text("a"), anonymousMention("X")),
      paragraph(anonymousMention("Y"))
    );

    expect(addressesOf(walk(apart).targets)).toEqual(["body", "body.#0.label", "body.#1.label"]);
  });

  it("counts every embed, so an id-less one is not renumbered by the ids around it", () => {
    const mixed = tree(ctaBlock("b1", "Named"), anonymousCta("Anonymous"));

    expect(addressesOf(walk(mixed).targets)).toEqual(["body.b1:cta.heading", "body.#1.heading"]);
  });

  it("addresses two levels deep with one token per embed crossed", () => {
    const nestedOnly = tree(
      block({
        id: "s1",
        blockType: "section",
        title: "Section title",
        content: tree(paragraph(text("Inner prose")), ctaBlock("c1", "Deep heading")),
      })
    );

    expect(addressesOf(walk(nestedOnly).targets)).toEqual([
      "body.s1:section.title",
      "body.s1:section.content",
      "body.s1:section.content.c1:cta.heading",
    ]);
  });

  it("addresses an embed through the plugin's address grammar, escaping included", () => {
    const odd: BlockLike = { slug: "c:ta", fields: cta.fields };
    const oddTree = tree(block({ id: "b.1#x", blockType: "c:ta", heading: "Odd" }));

    expect(addressesOf(walk(oddTree, { blocks: [odd], inlineBlocks: [] }).targets)).toEqual([
      "body.b\\.1\\#x:c\\:ta.heading",
    ]);
  });

  it("addresses an embed in a rich-text field that itself sits inside a blocks-field element", () => {
    const schema: FieldLike[] = [
      {
        type: "blocks",
        name: "sections",
        blocks: [{ slug: "hero", fields: [{ type: "richText", name: "copy", localized: true }] }],
      },
    ];
    const source = {
      sections: [{ id: "s1", blockType: "hero", copy: tree(ctaBlock("b1", "Click me")) }],
    };

    expect(addressesOf(walkDocument({ schema, source, ...LISTED }).targets)).toEqual([
      "sections.s1:hero.copy.b1:cta.heading",
    ]);
  });
});

const UNLISTED: readonly (readonly [string, Node])[] = [
  ["block", block({ id: "g1", blockType: "gallery", caption: "Caption" })],
  ["inline block", inlineBlock({ id: "g2", blockType: "footnote", note: "Note" })],
];

const between = (embed: Node): Tree =>
  tree(paragraph(text("Before"), embed, text("After")), paragraph(text("Next")));

describe("an embed nobody listed", () => {
  it.each(UNLISTED)("an unlisted %s yields no target, and its siblings still do", (_k, embed) => {
    expect(textsOf(walk(between(embed)))).toEqual(["Before", "After", "Next"]);
  });

  it.each(UNLISTED)("an unlisted %s is skipped silently, not reported", (_k, embed) => {
    const walked = walk(between(embed));
    expect(walked.targets.length).toBeGreaterThan(0);

    expect(walked.reported).toEqual([]);
  });

  it("a block whose slug is listed only for inline blocks is unlisted for a block node", () => {
    const blockNode = block({ id: "m1", blockType: "mention", label: "Ada" });

    expect(textsOf(walk(between(blockNode)))).toEqual(["Before", "After", "Next"]);
  });

  it("an inline block whose slug is listed only for blocks is unlisted for an inline node", () => {
    const inlineNode = inlineBlock({ id: "c1", blockType: "cta", heading: "Click me" });

    expect(textsOf(walk(between(inlineNode)))).toEqual(["Before", "After", "Next"]);
  });
});

describe("one slug registered in both lists", () => {
  const both: Lists = {
    blocks: [{ slug: "quote", fields: [{ type: "text", name: "quoteText", localized: true }] }],
    inlineBlocks: [
      { slug: "quote", fields: [{ type: "text", name: "attribution", localized: true }] },
    ],
  };
  const fields = { id: "q1", blockType: "quote", quoteText: "Quoted", attribution: "Someone" };

  it("same slug in both lists: a block node takes its fields from the block list", () => {
    expect(textsOf(walk(tree(block(fields)), both))).toEqual(["Quoted"]);
  });

  it("same slug in both lists: an inline block node takes its fields from the inline list", () => {
    expect(textsOf(walk(tree(paragraph(inlineBlock(fields))), both))).toEqual(["Someone"]);
  });
});

describe("the host's own selection rule, inside an embed", () => {
  it("host rule: a non-localized field inside an embed yields no target", () => {
    const linkBlock = block({ id: "l1", blockType: "link", label: "Read more", href: "/more" });

    expect(textsOf(walk(tree(linkBlock)))).toEqual(["Read more"]);
  });

  it("host rule: a non-localized rich-text field inside an embed is not walked", () => {
    const asideBlock = block({
      id: "a1",
      blockType: "aside",
      title: "Aside title",
      notes: tree(paragraph(text("Shared notes"))),
    });

    expect(textsOf(walk(tree(asideBlock)))).toEqual(["Aside title"]);
  });
});

const headingOnly: FieldLike[] = [{ type: "text", name: "heading", localized: true }];

const claimsEverything: EmbedResolver = (_kind, _blockType, data) => ({
  languageId: PAYLOAD_FIELDS_ID,
  context: { fields: headingOnly, data, source: data },
});

const NOT_EMBEDS: readonly (readonly [string, Node])[] = [
  ["a block whose fields carry no blockType", block({ id: "x", heading: "Orphan" })],
  ["a block whose blockType is not a string", block({ id: "x", blockType: 7, heading: "Orphan" })],
  ["a block with no fields", { type: "block", version: 2 }],
  ["a block whose fields are not an object", block("Orphan")],
  ["an inline block whose fields carry no blockType", inlineBlock({ heading: "Orphan" })],
  [
    "a node of another type carrying fields with a blockType",
    { type: "upload", version: 3, fields: { id: "u1", blockType: "cta", heading: "Orphan" } },
  ],
];

describe("a node that is not an embed", () => {
  it.each(NOT_EMBEDS)("%s yields no target, and its siblings still do", (_label, node) => {
    const targets = walkTree({ tree: between(node), embed: claimsEverything }, [
      payloadFieldsLanguage(),
    ]);

    expect(targets.map((target) => target.text)).toEqual(["Before", "After", "Next"]);
  });
});

describe("what the resolver is asked, and what is done with its answer", () => {
  type Asked = Parameters<EmbedResolver>;

  const askedFor = (embedTree: Tree): Asked[] => {
    const asked: Asked[] = [];
    const recording: EmbedResolver = (...args) => {
      asked.push(args);
      return null;
    };
    walkTree({ tree: embedTree, embed: recording });
    return asked;
  };

  it.each([
    ["block", tree(ctaBlock("b1", "Click me"))],
    ["inlineBlock", tree(paragraph(inlineBlock({ id: "i1", blockType: "cta", heading: "Hi" })))],
  ] as const)("asks with %s as the kind, taken from the node's own type", (kind, embedTree) => {
    expect(askedFor(embedTree).map(([asked]) => asked)).toEqual([kind]);
  });

  it("asks with the slug the node declares", () => {
    expect(askedFor(tree(ctaBlock("b1", "Click me"))).map(([, slug]) => slug)).toEqual(["cta"]);
  });

  it("hands over the node's own fields object, the one the walk writes into", () => {
    const fields = { id: "b1", blockType: "cta", heading: "Click me" };

    const asked = askedFor(tree(block(fields)));

    expect(asked[0]?.[2]).toBe(fields);
  });

  it("returns the resolver's crossing unchanged", () => {
    const handedOver = { anything: "the resolver chose" };
    const received: unknown[] = [];
    const recorder: Language<string, null> = {
      id: "recorder",
      enter: ({ context }) => {
        received.push(context);
        return { nodes: [], cursor: null };
      },
      step: () => ({ kind: "skip" }),
      selects: () => false,
      isEmpty: () => true,
      textUnits: () => [],
      boundary: () => null,
    };

    walkTree(
      {
        tree: tree(ctaBlock("b1", "Click me")),
        embed: () => ({ languageId: "recorder", context: handedOver }),
      },
      [recorder]
    );

    expect(received[0]).toBe(handedOver);
  });
});
