import { describe, expect, it } from "vitest";

import { projectTranslatableContent } from "../../../core/domain/content-projection/contentProjector.js";
import { translatableFields } from "../../../core/domain/content-projection/translatableFields.js";
import type { BlockLike, FieldLike } from "../../../core/kernel/field-traversal/index.js";
import { payloadLexicalContent, payloadLexicalLanguage } from "../../payload-lexical/index.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../index.js";
import { block, paragraph, text, tree } from "../../__tests__/fixtures/lexical.js";
import type { Doc } from "../../__tests__/fixtures/lexical.js";

const cta: BlockLike = {
  slug: "cta",
  fields: [{ type: "text", name: "heading", localized: true }],
};

/**
 * `sections` is here so the addresses under test are more than one segment deep: a one-segment
 * fixture passes even when the segments are joined with a comma instead of a dot.
 */
const schema: FieldLike[] = [
  { type: "text", name: "title", localized: true },
  { type: "richText", name: "body", localized: true },
  { type: "blocks", name: "sections", blocks: [cta] },
];

const sections = [{ id: "s1", blockType: "cta", heading: "Read on" }];

const walk = {
  languages: [
    payloadFieldsLanguage({ crossings: [payloadLexicalContent()], blocks: [cta] }),
    payloadLexicalLanguage(),
  ],
  hostLanguageId: PAYLOAD_FIELDS_ID,
};

const fields = (source: Doc) => translatableFields(source, schema, walk);

const whatStalenessHashes = (source: Doc) =>
  new Map<string, string>(
    projectTranslatableContent(source, schema).map((e): [string, string] => [e.idPath, e.text])
  );

const bolded = (value: string) => ({ ...text(value), format: 1 });

const prose = (): Doc => ({
  title: "Hello",
  body: tree(paragraph(text("Intro ")), paragraph(text("and more"))),
  sections,
});

const withBlock = (): Doc => ({
  title: "Hello",
  body: tree(paragraph(text("Intro ")), block({ id: "b1", blockType: "cta", heading: "Buy now" })),
  sections,
});

const whereTheJoinsDisagree: [string, () => Doc][] = [
  [
    "a blank node between two runs",
    () => ({ body: tree(paragraph(text("Hello"), text(" "), text("world"))), sections }),
  ],
  [
    "a bold split with a blank between",
    () => ({
      body: tree(paragraph(text("a"), text(" "), bolded("red"), text(" "), text("car"))),
      sections,
    }),
  ],
  [
    "a bold split with no blank",
    () => ({ body: tree(paragraph(text("a "), bolded("red"), text(" car"))), sections }),
  ],
  ["padded edges", () => ({ body: tree(paragraph(text("  Hello  "))), sections })],
  [
    "padding across paragraphs",
    () => ({ body: tree(paragraph(text("  Intro")), paragraph(text("and more  "))), sections }),
  ],
  [
    "an empty node among text",
    () => ({ body: tree(paragraph(text("one"), text(""), text("two"))), sections }),
  ],
];

describe("a document with nothing embedded in its rich text", () => {
  it("offers exactly the addresses the projector offers", () => {
    expect(
      fields(prose())
        .map((f) => String(f.address))
        .sort()
    ).toEqual([...whatStalenessHashes(prose()).keys()].sort());
  });

  it.each(whereTheJoinsDisagree)(
    "hashes %s exactly as before, so it cannot go stale",
    (_name, build) => {
      const old = whatStalenessHashes(build());

      for (const field of fields(build())) {
        expect(field.ownText).toBe(old.get(String(field.address)));
        expect(field.crossedIn, "nothing is embedded here, so nothing is carried").toEqual([]);
      }
    }
  );
});

describe("a document holding a block inside its rich text", () => {
  it("keeps the field's own address, however deep the text sits", () => {
    expect(
      fields(withBlock())
        .map((f) => String(f.address))
        .sort()
    ).toEqual(["body", "sections.s1:cta.heading", "title"]);
  });

  it("keeps the field's own text untouched and carries the block's text beside it", () => {
    const old = whatStalenessHashes(withBlock());

    for (const field of fields(withBlock())) {
      const address = String(field.address);
      expect(field.ownText, "what the projector already produced for this field").toBe(
        old.get(address) ?? ""
      );
      expect(field.crossedIn.map((piece) => piece.text)).toEqual(
        address === "body" ? ["Buy now"] : []
      );
    }
  });
});

describe("the one key set that moves, and the one that does not", () => {
  it("a rich text whose only text is inside a block gains an address it never had", () => {
    const only: Doc = { body: tree(block({ id: "b1", blockType: "cta", heading: "Buy now" })) };

    expect([...whatStalenessHashes(only).keys()]).toEqual([]);
    expect(fields(only).map((f) => String(f.address))).toEqual(["body"]);
  });

  it("a rich text holding only whitespace gains nothing, in either path", () => {
    const blank: Doc = { body: tree(paragraph(text("   "))) };

    expect([...whatStalenessHashes(blank).keys()]).toEqual([]);
    expect(fields(blank).map((f) => String(f.address))).toEqual([]);
  });
});
