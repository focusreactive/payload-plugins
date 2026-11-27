import type { CollectionSlug } from "payload";

import type { FieldFingerprints } from "../../../core/domain/content-projection/computeFieldFingerprints.js";
import type { SourceFingerprinter } from "../../../core/domain/content-projection/sourceFingerprinter.js";
import type { LeafAddress } from "../../../core/domain/content-projection/idPath.js";
import { isRecordStale } from "../../../core/domain/provenance/index.js";
import type { ProvenanceKey, ProvenanceStore } from "../../../core/domain/provenance/index.js";
import { driftedAddresses } from "../../../core/domain/provenance/index.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import type { BestEffort } from "./bestEffortIn.js";
import { bestEffortIn } from "./bestEffortIn.js";
import type { ProvenanceLogger, SourceDocumentReader } from "./Provenance.shapes.js";

/** What one translated locale of a document is measured to be, as the domain says it. */
export type LocaleStaleness = {
  targetLocale: string;
  sourceLocale: string;
  isStale: boolean;
  translatedAt: string;
  /** Absent, not empty, when the receipt's fingerprint is empty or unreadable: nothing is known. */
  changedLeaves?: LeafAddress[];
};

export type DocumentStalenessIo = {
  logger: ProvenanceLogger;
  readSource: SourceDocumentReader;
  fingerprintOf: SourceFingerprinter;
};

/**
 * Whether a translated locale is out of date, and the act of saying it no longer is.
 */
export class DocumentStaleness {
  private readonly store: ProvenanceStore;
  private readonly readSource: SourceDocumentReader;
  private readonly fingerprintOf: SourceFingerprinter;
  private readonly bestEffort: BestEffort;

  constructor(store: ProvenanceStore, scope: RequestScope, io: DocumentStalenessIo) {
    this.store = store;
    this.readSource = io.readSource;
    this.fingerprintOf = io.fingerprintOf;
    this.bestEffort = bestEffortIn(scope, io.logger);
  }

  /**
   * Per-locale staleness for one document. A locale whose fingerprint cannot be recomputed is dropped
   * and the remaining locales still report; see {@link bestEffortIn} for when that failure escapes
   * instead.
   */
  async getStaleness(
    collection: CollectionSlug,
    documentId: string,
    user: Record<string, unknown> | null = null
  ): Promise<LocaleStaleness[]> {
    const records = await this.store.findByDocument(collection, documentId);
    if (records.length === 0) return [];

    // The records of one document often share a source locale; read and hash each one once.
    const seen = new Map<string, FieldFingerprints>();
    const locales: LocaleStaleness[] = [];
    for (const record of records) {
      const recomputedOrSwallowed = await this.bestEffort(
        {
          collection,
          documentId,
          targetLocale: record.targetLocale,
          sourceLocale: record.sourceLocale,
        },
        "translator: failed to compute staleness for locale",
        async () => {
          const known = seen.get(record.sourceLocale);
          if (known !== undefined) return known;

          const fresh = await this.sourceAsItStands({
            collection,
            documentId,
            sourceLocale: record.sourceLocale,
            user,
          });
          if (fresh !== null) seen.set(record.sourceLocale, fresh);
          return fresh;
        }
      );
      if (recomputedOrSwallowed == null) continue;

      const recorded = record.sourceFingerprint;
      locales.push({
        targetLocale: record.targetLocale,
        sourceLocale: record.sourceLocale,
        isStale: isRecordStale(record, recomputedOrSwallowed),
        translatedAt: record.translatedAt,
        ...(recorded === null
          ? {}
          : { changedLeaves: driftedAddresses(recorded, recomputedOrSwallowed) }),
      });
    }
    return locales;
  }

  /**
   * Accept the translation as it stands: the receipt is re-based on the source as it is now.
   *
   * A leaf no run ever answered is re-based too — the person speaks for the whole document-locale,
   * so the recorder's `UNANSWERED` preservation deliberately does not apply. A receipt that predates
   * per-leaf fingerprints is upgraded to one, so the panel can name moved leaves from then on.
   *
   * Not best-effort: a person pressed a button, so a store failure reaches them rather than
   * becoming a log line they will never see.
   */
  async dismiss(key: ProvenanceKey, user: Record<string, unknown> | null = null): Promise<void> {
    const record = await this.store.find(key);
    if (!record) return;

    const fingerprint = await this.sourceAsItStands({
      collection: key.collectionSlug,
      documentId: key.documentId,
      sourceLocale: record.sourceLocale,
      user,
    });
    if (fingerprint === null) return;

    await this.store.rebaseSourceFingerprint(key, fingerprint);
  }

  private async sourceAsItStands(where: {
    collection: CollectionSlug;
    documentId: string;
    sourceLocale: string;
    user: Record<string, unknown> | null;
  }): Promise<FieldFingerprints | null> {
    const sourceData = await this.readSource({
      collection: where.collection,
      id: where.documentId,
      locale: where.sourceLocale,
      user: where.user,
    });
    if (!sourceData) return null;

    return this.fingerprintOf(where.collection, sourceData);
  }
}
