import type { CollectionSlug } from "payload";

import { computeFieldFingerprints } from "../../../core/domain/content-projection/computeFieldFingerprints.js";
import type {
  FieldFingerprints,
  SourceHash,
} from "../../../core/domain/content-projection/computeFieldFingerprints.js";
import type { FieldLike } from "../../../core/kernel/field-traversal/index.js";
import type { LeafAddress } from "../../../core/domain/content-projection/idPath.js";
import { isRecordStale } from "../../../core/domain/provenance/index.js";
import type {
  ProvenanceKey,
  ProvenanceStore,
  RecordedClaim,
  RecordedFingerprints,
} from "../../../core/domain/provenance/index.js";
import { driftedAddresses, UNANSWERED } from "../../../core/domain/provenance/index.js";
import type { LeafOutcome } from "../../../core/translation-pipeline/types/index.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import { swallowOrThrow } from "../../shared/payload/swallowOrThrow.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
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

/**
 * An unsent leaf is never re-based on the current hash — that would mark current a leaf no run
 * translated. A half-answered one has source text seated in its target, so no hash describes it.
 */
function claimToRecord(
  answeredInFull: boolean | undefined,
  hash: SourceHash,
  alreadyClaimed: RecordedClaim | undefined
): RecordedClaim {
  if (answeredInFull === undefined) return alreadyClaimed ?? UNANSWERED;
  return answeredInFull ? hash : UNANSWERED;
}

/**
 * Owns the receipt: a stored fingerprint is only ever written or read here, so the recorded claim
 * and the hash it is later compared against cannot be computed two different ways.
 *
 * Best-effort by contract, except where swallowing would hide a loss — see {@link swallowOrThrow}.
 */
export class ProvenanceService {
  private readonly store: ProvenanceStore;
  private readonly schemaMap: CollectionSchemaMap;
  private readonly scope: RequestScope;
  private readonly logger: ProvenanceLogger;
  private readonly readSource: SourceDocumentReader;

  constructor(
    store: ProvenanceStore,
    schemaMap: CollectionSchemaMap,
    scope: RequestScope,
    io: { logger: ProvenanceLogger; readSource: SourceDocumentReader }
  ) {
    this.store = store;
    this.schemaMap = schemaMap;
    this.scope = scope;
    this.logger = io.logger;
    this.readSource = io.readSource;
  }

  /** What a failed best-effort step names in the log, beyond the error and the message. */
  private bestEffort<T>(
    about: { collection: string; documentId: string; targetLocale?: string; sourceLocale?: string },
    msg: string,
    work: () => Promise<T>
  ): Promise<T | undefined> {
    return swallowOrThrow(this.scope, work, (err) => this.logger.error({ err, ...about, msg }));
  }

  /**
   * Hash the source a translation is made from — the baseline staleness is measured against.
   *
   * `null` when the collection has no schema here or hashing fails; the caller decides what that
   * costs — `Provenance.module` skips provenance, `driftedLeaves` refuses the run.
   */
  captureFingerprint(
    collection: CollectionSlug,
    sourceData: Record<string, unknown>
  ): FieldFingerprints | null {
    const schema = this.schemaMap.get(collection);
    if (!schema) return null;
    try {
      return computeFieldFingerprints(sourceData, schema);
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
        const sent = new Map(leaves.map((leaf) => [String(leaf.idPath), leaf.answeredInFull]));
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
   * `record` writes nothing instead of writing half a receipt.
   */
  private async readFingerprintOrThrow(key: ProvenanceKey): Promise<RecordedFingerprints | null> {
    const existing = await this.store.find(key);
    return existing?.sourceFingerprint ?? null;
  }

  /**
   * Per-locale staleness for one document. A locale whose fingerprint cannot be recomputed is dropped
   * and the remaining locales still report; see {@link swallowOrThrow} for when that failure escapes
   * instead.
   */
  async getStaleness(
    collection: CollectionSlug,
    documentId: string,
    user: Record<string, unknown> | null = null
  ): Promise<LocaleStaleness[]> {
    const schema = this.schemaMap.get(collection);
    if (!schema) return [];

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
            schema,
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
   * so the `UNANSWERED` preservation in {@link record} deliberately does not apply. A receipt that
   * predates per-leaf fingerprints is upgraded to one, so the panel can name moved leaves for that
   * locale from then on.
   *
   * Alone among these methods it is not best-effort: a person pressed a button, so a store failure
   * reaches them rather than becoming a log line they will never see.
   */
  async dismiss(key: ProvenanceKey, user: Record<string, unknown> | null = null): Promise<void> {
    const schema = this.schemaMap.get(key.collectionSlug);
    if (!schema) return;

    const record = await this.store.find(key);
    if (!record) return;

    const fingerprint = await this.sourceAsItStands({
      collection: key.collectionSlug,
      documentId: key.documentId,
      sourceLocale: record.sourceLocale,
      schema,
      user,
    });
    if (fingerprint === null) return;

    await this.store.rebaseSourceFingerprint(key, fingerprint);
  }

  /** `null` when the source document is not readable by this caller. */
  private async sourceAsItStands(where: {
    collection: CollectionSlug;
    documentId: string;
    sourceLocale: string;
    schema: FieldLike[];
    user: Record<string, unknown> | null;
  }): Promise<FieldFingerprints | null> {
    const sourceData = await this.readSource({
      collection: where.collection,
      id: where.documentId,
      locale: where.sourceLocale,
      user: where.user,
    });
    if (!sourceData) return null;

    return computeFieldFingerprints(sourceData, where.schema);
  }
}
