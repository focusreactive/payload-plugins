import type { CollectionSlug } from "payload";

import { computeSourceFingerprint } from "../../../core/domain/content-projection/computeSourceFingerprint.js";
import { computeFieldFingerprints } from "../../../core/domain/content-projection/computeFieldFingerprints.js";
import type { FieldFingerprints } from "../../../core/domain/content-projection/computeFieldFingerprints.js";
import type { FieldLike } from "../../../core/kernel/field-traversal/index.js";
import { isRecordStale } from "../../../core/domain/provenance/index.js";
import type {
  CurrentFingerprint,
  ProvenanceKey,
  ProvenanceStore,
  SourceFingerprint,
} from "../../../core/domain/provenance/index.js";
import { DECLINED, recordsEachLeaf } from "../../../core/domain/provenance/index.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import { swallowOrThrow } from "../../shared/payload/swallowOrThrow.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { ProvenanceLogger, SourceDocumentReader } from "./Provenance.shapes.js";

/** Per-locale staleness for one document (snake_case, matching the other translation endpoints). */
export type StalenessLocale = {
  target_lng: string;
  source_lng: string;
  is_stale: boolean;
  translated_at: string;
};

function previousClaim(
  previous: SourceFingerprint | null,
  address: string
): string | typeof DECLINED {
  if (!recordsEachLeaf(previous)) return DECLINED;
  return previous.hashes[address] ?? DECLINED;
}

/**
 * The single owner of fingerprint policy: write and read hash through this one class, so they cannot
 * drift.
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

  /**
   * Hash the source a translation is made from — the baseline staleness is measured against.
   *
   * Safe on either side of the pipeline: the pipeline detaches the leaves it writes into.
   * `null` on any failure (no schema, hashing error), so provenance is skipped, not the translation.
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
   * The map is **merged**, not replaced: a skipped leaf keeps the previous receipt's claim, or is
   * marked seen-but-not-ours. An address the document no longer has is dropped, retiring the field.
   *
   * @param currentFields - Every translatable leaf of the source as it stands now.
   * @param translatedAddresses - The leaves this run actually sent for translation.
   */
  async record(
    key: ProvenanceKey & { sourceLocale: string },
    currentFields: FieldFingerprints,
    translatedAddresses: readonly string[]
  ): Promise<void> {
    await swallowOrThrow(
      this.scope,
      async () => {
        const previous = await this.readFingerprintOrThrow(key);
        const translated = new Set(translatedAddresses);
        const hashes: Record<string, string | typeof DECLINED> = {};
        for (const [address, hash] of Object.entries(currentFields)) {
          hashes[address] = translated.has(address) ? hash : previousClaim(previous, address);
        }

        await this.store.upsert({
          collectionSlug: key.collectionSlug,
          documentId: key.documentId,
          targetLocale: key.targetLocale,
          sourceLocale: key.sourceLocale,
          sourceFingerprint: { kind: "fields", hashes },
          translatedAt: new Date().toISOString(),
          dismissedFingerprint: null,
        });
      },
      (error) =>
        this.logger.error({
          err: error,
          collection: key.collectionSlug,
          documentId: key.documentId,
          targetLocale: key.targetLocale,
          sourceLocale: key.sourceLocale,
          msg: "translator: failed to record translation provenance",
        })
    );
  }

  /** The receipt this document-locale holds, best-effort: an unreachable sidecar reads as `null`, i.e. every leaf unknown. */
  async lastTranslatedFrom(key: ProvenanceKey): Promise<SourceFingerprint | null> {
    const read = await swallowOrThrow(
      this.scope,
      () => this.readFingerprintOrThrow(key),
      (error) =>
        this.logger.error({
          err: error,
          collection: key.collectionSlug,
          documentId: key.documentId,
          targetLocale: key.targetLocale,
          msg: "translator: failed to read translation provenance",
        })
    );
    return read ?? null;
  }

  private async readFingerprintOrThrow(key: ProvenanceKey): Promise<SourceFingerprint | null> {
    const existing = await this.store.find(key);
    return existing?.sourceFingerprint ?? null;
  }

  /**
   * Per-locale staleness for one document. A locale whose fingerprint cannot be recomputed is dropped
   * from the result; if the caller is inside a transaction, that failure propagates instead and the
   * locales after it go unreported.
   */
  async getStaleness(
    collection: CollectionSlug,
    documentId: string,
    user: Record<string, unknown> | null = null
  ): Promise<StalenessLocale[]> {
    const schema = this.schemaMap.get(collection);
    if (!schema) return [];

    const records = await this.store.findByDocument(collection, documentId);
    if (records.length === 0) return [];

    const currentFingerprint = this.makeCurrentFingerprint(collection, documentId, schema, user);
    const locales: StalenessLocale[] = [];
    for (const record of records) {
      const recomputedOrSwallowed = await swallowOrThrow(
        this.scope,
        () => currentFingerprint(record.sourceLocale),
        (error) =>
          this.logger.error({
            err: error,
            collection,
            documentId,
            targetLocale: record.targetLocale,
            sourceLocale: record.sourceLocale,
            msg: "translator: failed to compute staleness for locale",
          })
      );
      if (recomputedOrSwallowed == null) continue;

      locales.push({
        target_lng: record.targetLocale,
        source_lng: record.sourceLocale,
        is_stale: isRecordStale(record, recomputedOrSwallowed),
        translated_at: record.translatedAt,
      });
    }
    return locales;
  }

  /**
   * Acknowledge the current source drift for one target locale: persist the current fingerprint as the
   * dismissed one, so the indicator hides until the source changes again. No-op when the collection has
   * no schema, the locale has no record, or the source is not readable by this caller.
   */
  async dismiss(key: ProvenanceKey, user: Record<string, unknown> | null = null): Promise<void> {
    const schema = this.schemaMap.get(key.collectionSlug as CollectionSlug);
    if (!schema) return;

    const record = await this.store.find(key);
    if (!record) return;

    const currentFingerprint = this.makeCurrentFingerprint(
      key.collectionSlug as CollectionSlug,
      key.documentId,
      schema,
      user
    );
    const fingerprint = await currentFingerprint(record.sourceLocale);
    if (fingerprint === null) return;

    await this.store.dismiss(key, { kind: "fields", hashes: fingerprint.fields });
  }

  private makeCurrentFingerprint(
    collection: CollectionSlug,
    documentId: string,
    schema: FieldLike[],
    user: Record<string, unknown> | null
  ) {
    const cache = new Map<string, CurrentFingerprint>();
    return async (sourceLocale: string): Promise<CurrentFingerprint | null> => {
      const cached = cache.get(sourceLocale);
      if (cached !== undefined) return cached;
      const sourceData = await this.readSource({
        collection,
        id: documentId,
        locale: sourceLocale,
        user,
      });
      if (!sourceData) return null;

      const fingerprint: CurrentFingerprint = {
        document: computeSourceFingerprint(sourceData, schema),
        fields: computeFieldFingerprints(sourceData, schema),
      };
      cache.set(sourceLocale, fingerprint);
      return fingerprint;
    };
  }
}
