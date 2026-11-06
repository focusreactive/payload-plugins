import type { Field, Payload } from "payload";
import { describe, expect, it, vi } from "vitest";

import type {
  ProvenanceReceipt,
  ProvenanceStore,
  RecordedFingerprints,
} from "../../../../core/domain/provenance/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import { TranslatorConfigError } from "../../../../core/errors/index.js";
import { driftedLeaves } from "../Provenance.criterion.js";
import { ProvenanceService } from "../Provenance.service.js";
import { storeDouble } from "../../../../core/domain/provenance/__tests__/fixtures/provenanceStore.js";

const COLLECTION = "posts";
const schema: Field[] = [
  { name: "title", type: "text", localized: true },
  { name: "body", type: "text", localized: true },
];

const receipt = (sourceFingerprint: RecordedFingerprints | null): ProvenanceReceipt => ({
  collectionSlug: COLLECTION,
  documentId: "doc-1",
  targetLocale: "de",
  sourceLocale: "en",
  sourceFingerprint,
  translatedAt: "2026-10-22T00:00:00.000Z",
});

const answering = (stored: RecordedFingerprints | null, collections = [COLLECTION]) => {
  const store = storeDouble({
    find: vi.fn().mockResolvedValue(stored === null ? null : receipt(stored)),
  });

  return driftedLeaves(
    () =>
      new ProvenanceService(
        store,
        new Map(collections.map((slug) => [slug, schema])) as CollectionSchemaMap,
        {},
        { logger: { error: vi.fn() }, readSource: vi.fn() }
      )
  );
};

const ask = (sourceData: Record<string, unknown> = { title: "Hello", body: "World" }) => ({
  payload: {} as Payload,
  scope: {},
  target: {
    collection: COLLECTION,
    documentId: "doc-1",
    sourceLocale: "en",
    targetLocale: "de",
  },
  sourceData,
});

/** What the receipt holds after a run over this source — the criterion's own "nothing moved" state. */
const asTranslated = async () => {
  const everything = await answering(null)(ask());
  const service = new ProvenanceService(
    {} as unknown as ProvenanceStore,
    new Map([[COLLECTION, schema]]) as CollectionSchemaMap,
    {},
    { logger: { error: vi.fn() }, readSource: vi.fn() }
  );
  expect(everything).toEqual(["title", "body"]);
  return service.captureFingerprint(COLLECTION, { title: "Hello", body: "World" }) ?? {};
};

describe("the leaves provenance answers", () => {
  it("is none of them when the source stands where the receipt says", async () => {
    const hashes = await asTranslated();

    expect(await answering(hashes)(ask())).toEqual([]);
  });

  it("is the one whose source moved since that receipt", async () => {
    const hashes = await asTranslated();

    const answered = await answering(hashes)(ask({ title: "Hello", body: "Moved" }));

    expect(answered).toEqual(["body"]);
  });

  it("is every leaf when nothing can be read from the receipt", async () => {
    expect(await answering(null)(ask())).toEqual(["title", "body"]);
  });

  it("refuses to answer for a collection it has no schema for, rather than answer nothing", async () => {
    await expect(answering(null, [])(ask())).rejects.toThrow(TranslatorConfigError);
  });
});
