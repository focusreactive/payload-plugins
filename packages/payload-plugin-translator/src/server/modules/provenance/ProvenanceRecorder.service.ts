import type { CollectionSlug } from "payload";

import type {
  FieldFingerprints,
  SourceHash,
} from "../../../core/domain/content-projection/computeFieldFingerprints.js";
import type { SourceFingerprinter } from "../../../core/domain/content-projection/sourceFingerprinter.js";
import type {
  ProvenanceKey,
  ProvenanceStore,
  RecordedClaim,
  RecordedFingerprints,
} from "../../../core/domain/provenance/index.js";
import { UNANSWERED } from "../../../core/domain/provenance/index.js";
import type { LeafOutcome } from "../../../core/translation-pipeline/types/index.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import type { BestEffort } from "./bestEffortIn.js";
import { bestEffortIn } from "./bestEffortIn.js";
import type { ProvenanceLogger } from "./Provenance.shapes.js";

/**
 * An unsent leaf is never re-based on the current hash — that would mark current a leaf no run
 * translated. A half-answered one has source text seated in its target, so no hash describes it.
 */
function claimToRecord(
  answered: boolean | undefined,
  hash: SourceHash,
  alreadyClaimed: RecordedClaim | undefined
): RecordedClaim {
  if (answered === undefined) return alreadyClaimed ?? UNANSWERED;
  return answered ? hash : UNANSWERED;
}

export type RecorderIo = {
  logger: ProvenanceLogger;
  fingerprintOf: SourceFingerprinter;
};

/**
 * What a translation run writes to and reads from the receipt. A failure is logged rather than
 * thrown, except where {@link bestEffortIn} says it must reach the caller.
 */
export class ProvenanceRecorder {
  private readonly store: ProvenanceStore;
  private readonly logger: ProvenanceLogger;
  private readonly fingerprintOf: SourceFingerprinter;
  private readonly bestEffort: BestEffort;

  constructor(store: ProvenanceStore, scope: RequestScope, io: RecorderIo) {
    this.store = store;
    this.logger = io.logger;
    this.fingerprintOf = io.fingerprintOf;
    this.bestEffort = bestEffortIn(scope, io.logger);
  }

  /**
   * Hash the source a translation is made from — the baseline staleness is measured against.
   *
   * A hashing failure is logged and returned as the same `null` as an untranslated collection.
   */
  captureFingerprint(
    collection: CollectionSlug,
    sourceData: Record<string, unknown>
  ): FieldFingerprints | null {
    try {
      return this.fingerprintOf(collection, sourceData);
    } catch (error) {
      this.logger.error({
        err: error,
        collection,
        msg: "translator: failed to fingerprint source for provenance",
      });
      return null;
    }
  }

  /**
   * Write the receipt for a finished translation.
   *
   * @param currentFields - Every translatable leaf of the source as it stands now, not only the
   *   translated ones; the receipt is rebuilt from this map, so an omitted address retires the field.
   */
  async record(
    key: ProvenanceKey & { sourceLocale: string },
    currentFields: FieldFingerprints,
    leaves: readonly LeafOutcome[]
  ): Promise<void> {
    await this.bestEffort(
      {
        collection: key.collectionSlug,
        documentId: key.documentId,
        targetLocale: key.targetLocale,
        sourceLocale: key.sourceLocale,
      },
      "translator: failed to record translation provenance",
      async () => {
        const previous = await this.readFingerprintOrThrow(key);
        const alreadyClaimed = previous ?? {};
        const sent = new Map(leaves.map((leaf) => [String(leaf.idPath), leaf.answered]));
        const hashes: Record<string, RecordedClaim> = {};
        for (const [address, hash] of Object.entries(currentFields)) {
          hashes[address] = claimToRecord(sent.get(address), hash, alreadyClaimed[address]);
        }

        await this.store.upsert({
          collectionSlug: key.collectionSlug,
          documentId: key.documentId,
          targetLocale: key.targetLocale,
          sourceLocale: key.sourceLocale,
          sourceFingerprint: hashes,
          translatedAt: new Date().toISOString(),
        });
      }
    );
  }

  /** The receipt this document-locale holds — `null` both when there is none and when the read failed. */
  async lastTranslatedFrom(key: ProvenanceKey): Promise<RecordedFingerprints | null> {
    const read = await this.bestEffort(
      {
        collection: key.collectionSlug,
        documentId: key.documentId,
        targetLocale: key.targetLocale,
      },
      "translator: failed to read translation provenance",
      () => this.readFingerprintOrThrow(key)
    );
    return read ?? null;
  }

  /**
   * Throws rather than reporting "no receipt": without the previous claims every leaf this run did
   * not send would be written `UNANSWERED`, and the next run would re-translate reviewed text — so
   * {@link ProvenanceRecorder.record} writes nothing instead of writing half a receipt.
   */
  private async readFingerprintOrThrow(key: ProvenanceKey): Promise<RecordedFingerprints | null> {
    const existing = await this.store.find(key);
    return existing?.sourceFingerprint ?? null;
  }
}
