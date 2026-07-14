import type { CollectionSlug, Field, Payload } from "payload";

import { computeSourceFingerprint } from "../../../core/content-projection/computeSourceFingerprint";
import { isRecordStale } from "../../../core/provenance";
import type { ProvenanceStore } from "../../../core/provenance";
import { fetchSourceDocument } from "../_lib/sourceDocument";

import type { StalenessConfig, StalenessLocaleOutput } from "./model";

/**
 * Recompute the current source fingerprint the **same way the write path does**. Both sides fetch via
 * the shared {@link fetchSourceDocument} (identical `depth`/locale shape) and hash with the shared
 * {@link computeSourceFingerprint} + the same `schemaMap` entry, so an untouched document can never
 * report stale. Cached per source locale so a document translated from one source into N locales
 * fetches the source once.
 */
function makeCurrentFingerprint(
  payload: Payload,
  collection: CollectionSlug,
  documentId: string,
  schema: Field[]
) {
  const cache = new Map<string, string>();
  return async (sourceLocale: string): Promise<string> => {
    const cached = cache.get(sourceLocale);
    if (cached !== undefined) return cached;
    const sourceData = await fetchSourceDocument(payload, collection, documentId, sourceLocale);
    const fingerprint = computeSourceFingerprint(sourceData, schema);
    cache.set(sourceLocale, fingerprint);
    return fingerprint;
  };
}

/**
 * Per-locale staleness for one document: read every provenance record, recompute the current source
 * fingerprint, and mark each locale stale when the source drifted and the drift was not dismissed.
 * Returns `[]` when provenance is disabled or the collection has no schema — a normal condition, not
 * an error (genuine store/fetch failures propagate for the caller to log).
 */
export async function computeDocumentStaleness(
  payload: Payload,
  config: StalenessConfig,
  collection: CollectionSlug,
  documentId: string
): Promise<StalenessLocaleOutput[]> {
  const schema = config.schemaMap.get(collection);
  if (!config.provenanceStoreFactory || !schema) return [];

  const store = config.provenanceStoreFactory(payload);
  const records = await store.findByDocument(collection, documentId);
  if (records.length === 0) return [];

  const currentFingerprint = makeCurrentFingerprint(payload, collection, documentId, schema);
  const locales: StalenessLocaleOutput[] = [];
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
      // Isolate per-locale failures (e.g. the record's source locale was removed from Payload's
      // localization config): skip just this locale so one bad record can't blank the staleness of
      // every other, still-valid locale on the document.
      payload.logger.error({
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
 * Acknowledge the current source drift for one target locale: recompute the current source
 * fingerprint (write-path-identical) and persist it as the dismissed fingerprint, so the indicator
 * hides until the source changes again. No-op when provenance is disabled or the locale has no record.
 */
export async function dismissLocaleStaleness(
  payload: Payload,
  config: StalenessConfig,
  collection: CollectionSlug,
  documentId: string,
  targetLocale: string
): Promise<void> {
  const schema = config.schemaMap.get(collection);
  if (!config.provenanceStoreFactory || !schema) return;

  const store: ProvenanceStore = config.provenanceStoreFactory(payload);
  const key = { collectionSlug: collection, documentId, targetLocale };
  const record = await store.find(key);
  if (!record) return;

  const currentFingerprint = makeCurrentFingerprint(payload, collection, documentId, schema);
  await store.dismiss(key, await currentFingerprint(record.sourceLocale));
}
