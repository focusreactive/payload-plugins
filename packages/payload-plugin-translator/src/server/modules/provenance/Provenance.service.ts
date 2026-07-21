import type { CollectionSlug, Field, Payload } from "payload";

import { computeSourceFingerprint } from "../../../core/domain/content-projection/computeSourceFingerprint";
import { isRecordStale } from "../../../core/domain/provenance";
import type { ProvenanceKey, ProvenanceStore } from "../../../core/domain/provenance";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import { fetchSourceDocument } from "../../shared/payload/sourceDocument";

/** Per-locale staleness for one document (snake_case, matching the other translation endpoints). */
export type StalenessLocale = {
  target_lng: string;
  source_lng: string;
  is_stale: boolean;
  translated_at: string;
};

/** Builds a {@link ProvenanceService} bound to a Payload instance; absent when provenance is disabled. */
export type ProvenanceServiceFactory = (payload: Payload) => ProvenanceService;

/**
 * The single owner of provenance fingerprint policy — how the source is hashed on write, re-hashed on
 * read, and compared for staleness. The write path and the read path go through this one class, so
 * they can never drift (the biggest correctness trap in staleness detection). Sits above the CRUD
 * {@link ProvenanceStore} port; the port + `computeSourceFingerprint` + `isRecordStale` stay
 * framework-agnostic in the core.
 *
 * Best-effort by contract: fingerprint/record failures log and no-op rather than failing a translation.
 */
export class ProvenanceService {
  private readonly payload: Payload;
  private readonly store: ProvenanceStore;
  private readonly schemaMap: CollectionSchemaMap;

  constructor(payload: Payload, store: ProvenanceStore, schemaMap: CollectionSchemaMap) {
    this.payload = payload;
    this.store = store;
    this.schemaMap = schemaMap;
  }

  /**
   * Hash the PRISTINE source. The caller MUST pass source fetched **before** the translation pipeline
   * runs — the pipeline mutates object-valued leaves (e.g. richText nodes) in place, so hashing after
   * it would capture the target translation and make every fresh translation look instantly stale.
   * Returns `null` on any failure (no schema, hashing error) so provenance is skipped, not the translation.
   */
  captureFingerprint(
    collection: CollectionSlug,
    sourceData: Record<string, unknown>
  ): string | null {
    const schema = this.schemaMap.get(collection);
    if (!schema) return null;
    try {
      return computeSourceFingerprint(sourceData, schema);
    } catch (error) {
      this.payload.logger.error({
        err: error,
        collection,
        msg: "translator: failed to fingerprint source for provenance",
      });
      return null;
    }
  }

  /** Persist a translation receipt (best-effort; a store failure logs and no-ops). */
  async record(
    key: ProvenanceKey & { sourceLocale: string },
    sourceFingerprint: string
  ): Promise<void> {
    try {
      await this.store.upsert({
        collectionSlug: key.collectionSlug,
        documentId: key.documentId,
        targetLocale: key.targetLocale,
        sourceLocale: key.sourceLocale,
        sourceFingerprint,
        translatedAt: new Date().toISOString(),
        dismissedFingerprint: null,
      });
    } catch (error) {
      this.payload.logger.error({
        err: error,
        collection: key.collectionSlug,
        documentId: key.documentId,
        targetLocale: key.targetLocale,
        sourceLocale: key.sourceLocale,
        msg: "translator: failed to record translation provenance",
      });
    }
  }

  /**
   * Per-locale staleness for one document: read every receipt, recompute the current source
   * fingerprint (write-path-identical), and mark each locale stale on undismissed drift. Returns `[]`
   * when the collection has no schema. Isolates per-locale failures so one bad record can't blank the rest.
   */
  async getStaleness(collection: CollectionSlug, documentId: string): Promise<StalenessLocale[]> {
    const schema = this.schemaMap.get(collection);
    if (!schema) return [];

    const records = await this.store.findByDocument(collection, documentId);
    if (records.length === 0) return [];

    const currentFingerprint = this.makeCurrentFingerprint(collection, documentId, schema);
    const locales: StalenessLocale[] = [];
    for (const record of records) {
      try {
        const current = await currentFingerprint(record.sourceLocale);
        locales.push({
          target_lng: record.targetLocale,
          source_lng: record.sourceLocale,
          is_stale: isRecordStale(record, current),
          translated_at: record.translatedAt,
        });
      } catch (error) {
        this.payload.logger.error({
          err: error,
          collection,
          documentId,
          targetLocale: record.targetLocale,
          sourceLocale: record.sourceLocale,
          msg: "translator: failed to compute staleness for locale",
        });
      }
    }
    return locales;
  }

  /**
   * Acknowledge the current source drift for one target locale: persist the current fingerprint as the
   * dismissed one, so the indicator hides until the source changes again. No-op when the collection has
   * no schema or the locale has no record.
   */
  async dismiss(key: ProvenanceKey): Promise<void> {
    const schema = this.schemaMap.get(key.collectionSlug as CollectionSlug);
    if (!schema) return;

    const record = await this.store.find(key);
    if (!record) return;

    const currentFingerprint = this.makeCurrentFingerprint(
      key.collectionSlug as CollectionSlug,
      key.documentId,
      schema
    );
    await this.store.dismiss(key, await currentFingerprint(record.sourceLocale));
  }

  /**
   * Recompute the current source fingerprint the same way the write path does (shared fetch shape +
   * hash). Cached per source locale so a document translated from one source into N locales fetches
   * the source once.
   */
  private makeCurrentFingerprint(collection: CollectionSlug, documentId: string, schema: Field[]) {
    const cache = new Map<string, string>();
    return async (sourceLocale: string): Promise<string> => {
      const cached = cache.get(sourceLocale);
      if (cached !== undefined) return cached;
      const sourceData = await fetchSourceDocument(
        this.payload,
        collection,
        documentId,
        sourceLocale
      );
      const fingerprint = computeSourceFingerprint(sourceData, schema);
      cache.set(sourceLocale, fingerprint);
      return fingerprint;
    };
  }
}
