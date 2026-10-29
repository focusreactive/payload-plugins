import { describe, expect, it, vi } from "vitest";
import type { Field } from "payload";

import type { ProvenanceStore, RecordedFingerprints } from "../../domain/provenance/index.js";
import { changedLeaves, UNANSWERED } from "../../domain/provenance/index.js";
import { asHash } from "../../domain/provenance/__tests__/fixtures/claims.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import { ProvenanceService } from "../../../server/modules/provenance/Provenance.service.js";
import { makeIdPath } from "../../domain/content-projection/idPath.js";
import type { LeafOutcome } from "../types/index.js";
import { storeDouble } from "../../domain/provenance/__tests__/fixtures/provenanceStore.js";

const sent = (name: string, answeredInFull: boolean) => ({
  idPath: makeIdPath([{ kind: "key", name }]),
  answeredInFull,
});

const COLLECTION = "posts";
const KEY = {
  collectionSlug: COLLECTION,
  documentId: "1",
  targetLocale: "de",
  sourceLocale: "en",
};

const schema: Field[] = [
  { name: "title", type: "text", localized: true },
  { name: "summary", type: "text", localized: true },
];

const sourceHashes = { title: asHash("aaaa"), summary: asHash("bbbb") };

type Recorded = Record<string, string>;

const storeHolding = (
  previous: RecordedFingerprints | null
): ProvenanceStore & { upsert: ReturnType<typeof vi.fn> } =>
  storeDouble({
    find: vi.fn().mockResolvedValue(
      previous === null
        ? null
        : {
            ...KEY,
            sourceFingerprint: previous,
            translatedAt: "2026-01-01T00:00:00.000Z",
          }
    ),
  });

const storedClaims = async (args: {
  previous: RecordedFingerprints | null;
  leaves: LeafOutcome[];
}): Promise<Recorded> => {
  const store = storeHolding(args.previous);
  const service = new ProvenanceService(
    store,
    new Map([[COLLECTION, schema]]) as CollectionSchemaMap,
    {},
    { logger: { error: vi.fn() }, readSource: vi.fn() }
  );

  await service.record(KEY, sourceHashes, args.leaves);

  const written = store.upsert.mock.calls[0]?.[0] as { sourceFingerprint: Recorded };
  return written.sourceFingerprint;
};

describe("a leaf the run sent and never got back", () => {
  it("is recorded as unanswered when there is no previous receipt to fall back on", async () => {
    const hashes = await storedClaims({
      previous: null,
      leaves: [sent("title", true), sent("summary", false)],
    });

    expect(hashes).toEqual({ title: sourceHashes.title, summary: UNANSWERED });
  });

  it("overwrites an earlier claim, because the target now holds source text rather than that translation", async () => {
    const hashes = await storedClaims({
      previous: { title: asHash("0d"), summary: asHash("0dbb") },
      leaves: [sent("title", true), sent("summary", false)],
    });

    expect(hashes.summary).toBe(UNANSWERED);
  });

  it("keeps the claim an earlier run made for a leaf this one never sent", async () => {
    const hashes = await storedClaims({
      previous: { title: asHash("0d"), summary: asHash("0dbb") },
      leaves: [sent("title", true)],
    });

    expect(hashes.summary).toBe(asHash("0dbb"));
  });

  it("stays unanswered across a second run that also fails to translate it", async () => {
    const hashes = await storedClaims({
      previous: { title: asHash("aaaa"), summary: UNANSWERED },
      leaves: [sent("title", true)],
    });

    expect(hashes.summary).toBe(UNANSWERED);
  });
});

describe("what the unanswered leaf does on the second run", () => {
  it("is reported as drifted, so a run asking for what moved takes it again", () => {
    const stored: RecordedFingerprints = { title: sourceHashes.title, summary: UNANSWERED };

    expect(changedLeaves(stored, sourceHashes)).toEqual({ title: false, summary: true });
  });
});
