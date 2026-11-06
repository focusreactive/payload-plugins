import type { Field, Payload } from "payload";
import { describe, expect, it, vi } from "vitest";

import { computeFieldFingerprints } from "../../../../core/domain/content-projection/computeFieldFingerprints.js";
import type {
  ProvenanceReceipt,
  ProvenanceStore,
} from "../../../../core/domain/provenance/index.js";
import { UNANSWERED } from "../../../../core/domain/provenance/index.js";
import type { RequestScope } from "../../../shared/payload/RequestScope.shapes.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import { driftedLeaves } from "../Provenance.criterion.js";
import { ProvenanceService } from "../Provenance.service.js";

const COLLECTION = "posts";
const schema: Field[] = [
  { name: "title", type: "text", localized: true },
  { name: "body", type: "text", localized: true },
];
const schemaMap = new Map([[COLLECTION, schema]]) as CollectionSchemaMap;

const KEY = { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de" };
const TRANSLATED_AT = "2026-07-15T00:00:00.000Z";

/** `swallowOrThrow` reads `transactionID` alone, so an empty scope means no transaction to lose. */
const NO_TRANSACTION: RequestScope = {};
/** Threaded to the service factory by the criterion; nothing in these checks reads it. */
const UNUSED_PAYLOAD = {} as Payload;

const sourceWas = { id: "1", title: "Hello", body: "World" };
const sourceNow = { id: "1", title: "Hello", body: "Moved on" };

const hashesOf = (doc: Record<string, unknown>) => computeFieldFingerprints(doc, schema);

const receiptFrom = (
  doc: Record<string, unknown>,
  over: Partial<ProvenanceReceipt> = {}
): ProvenanceReceipt => ({
  collectionSlug: COLLECTION,
  documentId: "1",
  targetLocale: "de",
  sourceLocale: "en",
  sourceFingerprint: hashesOf(doc),
  translatedAt: TRANSLATED_AT,
  ...over,
});

function storeHoldingOneRow(seed: ProvenanceReceipt) {
  let row = seed;
  const store: ProvenanceStore = {
    upsert: async (receipt) => {
      row = receipt;
    },
    find: async () => row,
    findByDocument: async () => [row],
    rebaseSourceFingerprint: async (_key, sourceFingerprint) => {
      row = { ...row, sourceFingerprint };
    },
    deleteByDocument: async () => {},
  };
  return { store, row: () => row };
}

const serviceOver = (store: ProvenanceStore, source: Record<string, unknown> | null) =>
  new ProvenanceService(store, schemaMap, NO_TRANSACTION, {
    logger: { error: vi.fn() },
    readSource: async () => source,
  });

const ask = (sourceData: Record<string, unknown>) => ({
  payload: UNUSED_PAYLOAD,
  scope: NO_TRANSACTION,
  target: {
    collection: COLLECTION,
    documentId: "1",
    sourceLocale: "en",
    targetLocale: "de",
  },
  sourceData,
});

const dismissedAgainst = async (
  source: Record<string, unknown> | null,
  seed: ProvenanceReceipt = receiptFrom(sourceWas)
) => {
  const kept = storeHoldingOneRow(seed);
  await serviceOver(kept.store, source).dismiss(KEY);
  return kept;
};

describe("hiding the out-of-date mark", () => {
  it("leaves the locale reading as current, naming no moved leaves", async () => {
    const kept = await dismissedAgainst(sourceNow);

    const [locale] = await serviceOver(kept.store, sourceNow).getStaleness(COLLECTION, "1");

    expect(locale?.isStale).toBe(false);
    expect(
      locale?.changedLeaves,
      "the panel and the field tree read one receipt, so they cannot disagree"
    ).toEqual([]);
  });

  it("keeps those leaves out of a run that narrows by the drift rule", async () => {
    const kept = await dismissedAgainst(sourceNow);
    const rule = driftedLeaves(() => serviceOver(kept.store, sourceNow));

    await expect(
      rule(ask(sourceNow)),
      "a person said this translation is fine, so a run must not overwrite it"
    ).resolves.toEqual([]);
  });

  it("claims a leaf the receipt never answered", async () => {
    const neverAnswered = receiptFrom(sourceWas, {
      sourceFingerprint: { ...hashesOf(sourceWas), body: UNANSWERED },
    });

    const kept = await dismissedAgainst(sourceNow, neverAnswered);

    expect(kept.row().sourceFingerprint).toEqual(hashesOf(sourceNow));
  });

  it("upgrades a receipt nothing could be read from", async () => {
    const digest = receiptFrom(sourceWas, { sourceFingerprint: null });

    const kept = await dismissedAgainst(sourceNow, digest);

    expect(
      kept.row().sourceFingerprint,
      "the panel can name moved leaves for this locale from now on"
    ).toEqual(hashesOf(sourceNow));
  });

  it("does not move the moment the translation was made", async () => {
    const kept = await dismissedAgainst(sourceNow);

    expect(kept.row().translatedAt).toBe(TRANSLATED_AT);
  });

  it("writes nothing when the source is not readable by this caller", async () => {
    const seed = receiptFrom(sourceWas);

    const kept = await dismissedAgainst(null, seed);

    expect(kept.row()).toEqual(seed);
  });

  it("comes back when the source moves again", async () => {
    const kept = await dismissedAgainst(sourceNow);
    const movedTwice = { id: "1", title: "Hello", body: "Moved twice" };

    const [locale] = await serviceOver(kept.store, movedTwice).getStaleness(COLLECTION, "1");

    expect(locale?.isStale).toBe(true);
    expect(locale?.changedLeaves).toEqual(["body"]);
  });
});
