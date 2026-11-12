import { describe, expect, it } from "vitest";
import type { CollectionSlug } from "payload";

import { sourceFingerprinter } from "../../core/domain/content-projection/sourceFingerprinter.js";
import { translationLanguages } from "../../server/features/_lib/index.js";
import type { BlockLike, FieldLike } from "../../core/kernel/field-traversal/index.js";
import type { LanguageTable } from "../../core/traversal/index.js";
import type { Node } from "../../languages/__tests__/fixtures/lexical.js";
import { block, paragraph, text, tree } from "../../languages/__tests__/fixtures/lexical.js";
import recorded from "./fixtures/embedFreeHashes.baseline.json" with { type: "json" };

const COLLECTION = "posts" as CollectionSlug;

const cta: BlockLike = {
  slug: "cta",
  fields: [{ name: "heading", type: "text", localized: true }],
};

const schema: FieldLike[] = [
  { name: "title", type: "text", localized: true },
  { name: "body", type: "richText", localized: true },
];

const prose = (value: string): Node => paragraph(text(value));

const embedded = (id: string, heading: string): Node => block({ id, blockType: "cta", heading });

const bodyOf = (...children: Node[]) => ({
  title: "Pricing",
  body: tree(...children),
});

const hashes = sourceFingerprinter(new Map([[COLLECTION, schema]]), translationLanguages([cta]));

const bodyHash = (doc: Record<string, unknown>) => {
  const fingerprints = hashes(COLLECTION, doc);
  if (fingerprints === null) throw new Error("the collection must be translatable here");
  return fingerprints.body;
};

describe("a field's hash tells two documents apart", () => {
  it("when text moves between the field's own prose and a block embedded in it", () => {
    const moved = "today";
    const before = bodyOf(prose("Order"), embedded("b1", `${moved}Now`));
    const after = bodyOf(prose(`Order${moved}`), embedded("b1", "Now"));

    expect(
      bodyHash(after),
      "the same characters in a different place is a different document"
    ).not.toBe(bodyHash(before));
  });

  it("when the field's own prose changes and the embedded block does not", () => {
    const before = bodyOf(prose("Order"), embedded("b1", "Buy now"));
    const after = bodyOf(prose("Order today"), embedded("b1", "Buy now"));

    expect(
      bodyHash(after),
      "a field that carries a block must still notice an edit to its own prose"
    ).not.toBe(bodyHash(before));
  });

  it("when text moves between two embedded blocks", () => {
    const moved = "n";
    const before = bodyOf(prose("Prose"), embedded("b1", "Buy"), embedded("b2", `${moved}ow`));
    const after = bodyOf(prose("Prose"), embedded("b1", `Buy${moved}`), embedded("b2", "ow"));

    expect(bodyHash(after)).not.toBe(bodyHash(before));
  });

  it("when a block is replaced by a different one carrying the same text", () => {
    const before = bodyOf(prose("Prose"), embedded("b1", "Buy now"));
    const after = bodyOf(prose("Prose"), embedded("b2", "Buy now"));

    expect(
      bodyHash(after),
      "a translation recorded against the old block no longer describes the source"
    ).not.toBe(bodyHash(before));
  });
});

describe("a field's hash ignores what is not content", () => {
  it("reordering two embedded blocks is not a change", () => {
    const before = bodyOf(prose("Prose"), embedded("b1", "Buy"), embedded("b2", "now"));
    const after = bodyOf(prose("Prose"), embedded("b2", "now"), embedded("b1", "Buy"));

    expect(bodyHash(after), "the same blocks in a different order say the same thing").toBe(
      bodyHash(before)
    );
  });
});

const embedFreeSchema: FieldLike[] = [
  { name: "title", type: "text", localized: true },
  { name: "body", type: "richText", localized: true },
  { name: "untranslated", type: "text" },
  {
    name: "sections",
    type: "array",
    localized: true,
    fields: [{ name: "caption", type: "text", localized: true }],
  },
  {
    name: "layout",
    type: "blocks",
    localized: true,
    blocks: [{ slug: "quote", fields: [{ name: "saying", type: "text", localized: true }] }],
  },
  { name: "meta", type: "group", fields: [{ name: "summary", type: "text", localized: true }] },
];

describe("a field with nothing embedded in it hashes as it always did", () => {
  const baseline = recorded as {
    documents: Record<string, Record<string, unknown>>;
    baseline: Record<string, Record<string, Record<string, string> | null>>;
  };

  const walks: Record<string, LanguageTable> = {
    "no embeds registered": translationLanguages(),
    "embeds registered, none used": translationLanguages([cta]),
  };

  /**
   * Frozen, never re-recorded: the hashes as the hasher shipped. A hash that moves here marks every
   * stored document stale.
   */
  describe.each(Object.keys(baseline.baseline))("%s", (run) => {
    const walk = walks[run];
    if (walk === undefined) throw new Error(`the recorded run "${run}" has no walk to check it`);
    const fingerprintOf = sourceFingerprinter(new Map([[COLLECTION, embedFreeSchema]]), walk);

    it.each(Object.keys(baseline.baseline[run] ?? {}))("%s", (name) => {
      expect(fingerprintOf(COLLECTION, baseline.documents[name] ?? {})).toEqual(
        baseline.baseline[run]?.[name]
      );
    });
  });
});
