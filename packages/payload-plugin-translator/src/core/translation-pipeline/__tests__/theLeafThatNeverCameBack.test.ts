import { describe, expect, it, vi } from "vitest";
import type { Field } from "payload";

import type { ProvenanceStore, SourceFingerprint } from "../../domain/provenance/index.js";
import { changedLeaves, UNANSWERED } from "../../domain/provenance/index.js";
import { asHash } from "../../domain/provenance/__tests__/fixtures/claims.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import { ProvenanceService } from "../../../server/modules/provenance/Provenance.service.js";
import { SkipExistingStrategy } from "../strategies/index.js";
import { makeIdPath } from "../../domain/content-projection/idPath.js";
import type { LeafOutcome } from "../types/index.js";

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

type Recorded = Record<string, string | null>;

const storeHolding = (
  previous: SourceFingerprint | null
): ProvenanceStore & { upsert: ReturnType<typeof vi.fn> } => ({
  upsert: vi.fn().mockResolvedValue(undefined),
  find: vi
    .fn()
    .mockResolvedValue(
      previous === null
        ? null
        : {
            ...KEY,
            sourceFingerprint: previous,
            translatedAt: "2026-01-01T00:00:00.000Z",
            dismissedFingerprint: null,
          }
    ),
  findByDocument: vi.fn().mockResolvedValue([]),
  dismiss: vi.fn().mockResolvedValue(undefined),
  deleteByDocument: vi.fn().mockResolvedValue(undefined),
});

const storedClaims = async (args: {
  previous: SourceFingerprint | null;
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

  const written = store.upsert.mock.calls[0]?.[0] as {
    sourceFingerprint: { hashes: Recorded };
  };
  return written.sourceFingerprint.hashes;
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
      previous: { kind: "fields", hashes: { title: asHash("0d"), summary: asHash("0dbb") } },
      leaves: [sent("title", true), sent("summary", false)],
    });

    expect(hashes.summary).toBe(UNANSWERED);
  });

  it("leaves alone a leaf the run never sent, whatever an earlier receipt claimed", async () => {
    const hashes = await storedClaims({
      previous: { kind: "fields", hashes: { title: asHash("0d"), summary: asHash("0dbb") } },
      leaves: [sent("title", true)],
    });

    expect(hashes.summary).toBe(asHash("0dbb"));
  });

  it("stays unanswered across a second run that also fails to translate it", async () => {
    const hashes = await storedClaims({
      previous: { kind: "fields", hashes: { title: asHash("aaaa"), summary: UNANSWERED } },
      leaves: [sent("title", true)],
    });

    expect(hashes.summary).toBe(UNANSWERED);
  });
});

describe("what the unanswered leaf does on the second run", () => {
  const strategy = new SkipExistingStrategy();

  it("is reported as drifted, so a second run selects it again", () => {
    const stored: SourceFingerprint = {
      kind: "fields",
      hashes: { title: sourceHashes.title, summary: UNANSWERED },
    };

    const changed = changedLeaves(stored, sourceHashes);

    expect(changed.summary).toBe(true);
    expect(
      strategy.shouldTranslate({
        sourceValue: "World",
        targetValue: "World",
        sourceChanged: changed.summary,
      })
    ).toBe(true);
  });

  it("leaves a declined leaf alone, which is what declined has always meant", () => {
    const stored: SourceFingerprint = {
      kind: "fields",
      hashes: { title: sourceHashes.title, summary: null },
    };

    const changed = changedLeaves(stored, sourceHashes);

    expect(changed.summary).toBeUndefined();
    expect(
      strategy.shouldTranslate({
        sourceValue: "World",
        targetValue: "World",
        sourceChanged: changed.summary,
      })
    ).toBe(false);
  });
});
