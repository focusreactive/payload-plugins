import type { Field, Payload } from "payload";
import { describe, expect, it, vi } from "vitest";

import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import type { ConfigModifier } from "../../../../types/ConfigModifier.js";
import type {
  ProvenanceReceipt,
  ProvenanceStore,
  SourceFingerprint,
} from "../../../../core/domain/provenance/index.js";
import type { BeforeTranslation, RunContribution } from "../../translation-run/index.js";
import type { FieldFingerprints } from "../../../../core/domain/content-projection/computeFieldFingerprints.js";
import { PROVENANCE_MODULE, provenanceModule } from "../Provenance.module.js";
import { ProvenanceService } from "../Provenance.service.js";

const COLLECTION = "posts";
const NOT_IN_A_TRANSACTION = {};
const UNCHANGED: ConfigModifier = (config) => config;

const schema: Field[] = [
  { name: "title", type: "text", localized: true },
  { name: "body", type: "text", localized: true },
];

const receipt = (sourceFingerprint: SourceFingerprint | null): ProvenanceReceipt => ({
  collectionSlug: COLLECTION,
  documentId: "doc-1",
  targetLocale: "de",
  sourceLocale: "en",
  sourceFingerprint,
  translatedAt: "2026-10-22T00:00:00.000Z",
  dismissedFingerprint: null,
});

const moduleReading = (stored: SourceFingerprint | null) => {
  const store = {
    upsert: vi.fn().mockResolvedValue(undefined),
    find: vi.fn().mockResolvedValue(stored === null ? null : receipt(stored)),
    findByDocument: vi.fn().mockResolvedValue([]),
    dismiss: vi.fn().mockResolvedValue(undefined),
    deleteByDocument: vi.fn().mockResolvedValue(undefined),
  } as unknown as ProvenanceStore;

  return provenanceModule({
    serviceFactory: () =>
      new ProvenanceService(
        store,
        new Map([[COLLECTION, schema]]) as CollectionSchemaMap,
        NOT_IN_A_TRANSACTION,
        { logger: { error: vi.fn() }, readSource: vi.fn() }
      ),
    refuseACollidingSlug: UNCHANGED,
    addTheCollection: UNCHANGED,
    cleanUpOnDelete: () => UNCHANGED,
  });
};

const run = (over: Partial<BeforeTranslation> = {}): BeforeTranslation => ({
  payload: {} as Payload,
  target: {
    collection: COLLECTION,
    documentId: "doc-1",
    sourceLocale: "en",
    targetLocale: "de",
  },
  scope: NOT_IN_A_TRANSACTION,
  sourceData: { title: "Hello", body: "World" },
  previousAttempts: 0,
  moduleState: {},
  ...over,
});

const joinedWith = async (
  stored: SourceFingerprint | null,
  over: Partial<BeforeTranslation> = {}
) => {
  const tenant = moduleReading(stored);
  if (!tenant.beforeTranslation) throw new Error("the module must take the first position");
  return tenant.beforeTranslation(run(over));
};

const fingerprintsLeftBy = (contribution: RunContribution): FieldFingerprints => {
  const left = contribution.moduleState?.[PROVENANCE_MODULE];
  if (left === undefined) throw new Error("the module must leave its fingerprints for the write");
  return left as FieldFingerprints;
};

describe("what provenance tells the pipeline about drift", () => {
  it("answers leaf by leaf when the receipt records leaf by leaf", async () => {
    const asTranslated = fingerprintsLeftBy(await joinedWith(null));

    const joined = await joinedWith({ kind: "fields", hashes: asTranslated });

    expect(joined.sourceChangedByLeaf).toEqual({ title: false, body: false });
  });

  it("marks the leaf whose source moved since that receipt", async () => {
    const asTranslated = fingerprintsLeftBy(await joinedWith(null));

    const joined = await joinedWith(
      { kind: "fields", hashes: asTranslated },
      { sourceData: { title: "Hello", body: "Moved" } }
    );

    expect(joined.sourceChangedByLeaf).toEqual({ title: false, body: true });
  });

  it("says nothing at all when no receipt exists", async () => {
    expect((await joinedWith(null)).sourceChangedByLeaf).toBeUndefined();
  });

  it("says nothing at all for a receipt written before per-leaf fingerprints", async () => {
    const legacy: SourceFingerprint = { kind: "document", hash: "a".repeat(64) };

    expect((await joinedWith(legacy)).sourceChangedByLeaf).toBeUndefined();
  });

  it("still leaves the fingerprints behind for the write, whatever the receipt was", async () => {
    expect(fingerprintsLeftBy(await joinedWith(null))).toEqual(
      expect.objectContaining({ title: expect.any(String), body: expect.any(String) })
    );
  });
});
