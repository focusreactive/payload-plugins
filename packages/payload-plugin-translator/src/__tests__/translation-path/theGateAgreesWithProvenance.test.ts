import { describe, expect, it } from "vitest";
import type { CollectionSlug } from "payload";

import { hasSourceContentChanged } from "../../core/domain/auto-translate/index.js";
import { isRecordStale } from "../../core/domain/provenance/index.js";
import type { ProvenanceReceipt } from "../../core/domain/provenance/index.js";
import { sourceFingerprinter } from "../../core/domain/content-projection/sourceFingerprinter.js";
import { translationLanguages } from "../../server/features/_lib/index.js";
import type { BlockLike, FieldLike } from "../../core/kernel/field-traversal/index.js";
import { block, paragraph, text, tree } from "../../languages/__tests__/fixtures/lexical.js";

const COLLECTION = "posts" as CollectionSlug;

const cta: BlockLike = {
  slug: "cta",
  fields: [{ name: "heading", type: "text", localized: true }],
};

const schema: FieldLike[] = [
  { name: "title", type: "text", localized: true },
  { name: "body", type: "richText", localized: true },
  { name: "views", type: "number" },
];

const schemaMap = new Map([[COLLECTION, schema]]);
const fingerprintOf = sourceFingerprinter(schemaMap, translationLanguages([cta]));

const documentWith = (prose: string, heading: string) => ({
  title: "Pricing",
  body: tree(paragraph(text(prose)), block({ id: "b1", blockType: "cta", heading })),
});

const receiptRecording = (source: Record<string, unknown>): ProvenanceReceipt => ({
  collectionSlug: COLLECTION,
  documentId: "1",
  targetLocale: "de",
  sourceLocale: "en",
  translatedAt: "2026-11-12T00:00:00.000Z",
  sourceFingerprint: fingerprintOf(COLLECTION, source),
});

const provenanceSees = (before: Record<string, unknown>, after: Record<string, unknown>) =>
  isRecordStale(receiptRecording(before), fingerprintOf(COLLECTION, after) ?? {});

const theGateSees = (before: Record<string, unknown>, after: Record<string, unknown>) =>
  hasSourceContentChanged(before, after, COLLECTION, fingerprintOf);

describe("the auto-translate gate and provenance answer the same question the same way", () => {
  it("when the edit is inside a block embedded in a rich text", () => {
    const before = documentWith("Prose", "Buy now");
    const after = documentWith("Prose", "Buy today");

    expect(provenanceSees(before, after), "the panel marks this locale out of date").toBe(true);
    expect(
      theGateSees(before, after),
      "so a save of it must enqueue a translation, or the two disagree for ever"
    ).toBe(true);
  });

  it("when the edit is in the rich text's own prose", () => {
    const before = documentWith("Prose", "Buy now");
    const after = documentWith("Prose rewritten", "Buy now");

    expect(theGateSees(before, after)).toBe(true);
    expect(provenanceSees(before, after)).toBe(true);
  });

  it("when only a field that is not translatable moved", () => {
    const before = { ...documentWith("Prose", "Buy now"), views: 1 };
    const after = { ...documentWith("Prose", "Buy now"), views: 2 };

    expect(
      theGateSees(before, after),
      "a save that spends nothing at the provider must not start a run"
    ).toBe(false);
    expect(provenanceSees(before, after)).toBe(false);
  });

  it("when a translatable field went away", () => {
    const before = documentWith("Prose", "Buy now");
    const { title: _gone, ...after } = before;

    expect(theGateSees(before, after)).toBe(true);
    expect(provenanceSees(before, after)).toBe(true);
  });

  it("when nothing translatable moved", () => {
    const before = documentWith("Prose", "Buy now");
    const after = documentWith("Prose", "Buy now");

    expect(theGateSees(before, after)).toBe(false);
    expect(provenanceSees(before, after)).toBe(false);
  });
});
