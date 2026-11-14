import type { Field, Payload } from "payload";
import { describe, expect, it, vi } from "vitest";

import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import type { ConfigModifier } from "../../../../types/ConfigModifier.js";
import type {
  ProvenanceReceipt,
  RecordedFingerprints,
} from "../../../../core/domain/provenance/index.js";
import type { BeforeTranslation, RunContribution } from "../../translation-run/index.js";
import type { FieldFingerprints } from "../../../../core/domain/content-projection/computeFieldFingerprints.js";
import { PROVENANCE_MODULE, provenanceModule } from "../Provenance.module.js";
import { ProvenanceRecorder } from "../ProvenanceRecorder.service.js";
import { NO_PANEL_IN_THESE_CHECKS } from "./fixtures/inAChain.js";
import { storeDouble } from "../../../../core/domain/provenance/__tests__/fixtures/provenanceStore.js";
import { fingerprintsOf } from "./fixtures/fingerprinter.js";

const COLLECTION = "posts";
const NOT_IN_A_TRANSACTION = {};
const UNCHANGED: ConfigModifier = (config) => config;

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

const moduleReading = (stored: RecordedFingerprints | null) => {
  const store = storeDouble({
    find: vi.fn().mockResolvedValue(stored === null ? null : receipt(stored)),
  });

  return provenanceModule({
    recorderFactory: () =>
      new ProvenanceRecorder(store, NOT_IN_A_TRANSACTION, {
        logger: { error: vi.fn() },
        fingerprintOf: fingerprintsOf(new Map([[COLLECTION, schema]]) as CollectionSchemaMap),
      }),
    stalenessFactory: NO_PANEL_IN_THESE_CHECKS,
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
  stored: RecordedFingerprints | null,
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

describe("what provenance leaves behind for the write", () => {
  it("leaves the fingerprints whatever the receipt was", async () => {
    expect(fingerprintsLeftBy(await joinedWith(null))).toEqual(
      expect.objectContaining({ title: expect.any(String), body: expect.any(String) })
    );
  });
});
