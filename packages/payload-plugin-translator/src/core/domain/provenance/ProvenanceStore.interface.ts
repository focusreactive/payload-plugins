import type { RecordedFingerprints } from "./SourceFingerprint.js";

/**
 * Translation provenance — the durable record of *what source state a target locale was translated
 * from* (design: `docs/plans/2026-06-26-translation-provenance-and-lifecycle-design.md`).
 *
 * These are framework-agnostic contracts: plain data plus a storage port, with no Payload types, so
 * they live in the core. Only the Payload-backed implementation of {@link ProvenanceStore} (in the
 * plugin adapter) knows about Payload.
 */

/**
 * One provenance receipt: a single `(collection, document, target locale)` translation, as a consumer
 * reads it from the sidecar collection.
 *
 * `documentId` is always a string (Payload ids may be string or number — callers stringify on the
 * way in) and `translatedAt` is an ISO-8601 string, so the record shape is stable across databases.
 *
 * The source fingerprint is not here: how the plugin decides a locale is out of date is its own
 * business, and the staleness endpoint answers that question without it.
 *
 * @since 0.7.0
 */
export interface TranslationProvenanceRecord {
  collectionSlug: string;
  /** Stringified id of the translated document. */
  documentId: string;
  targetLocale: string;
  sourceLocale: string;
  translatedAt: string;
}

export interface ProvenanceReceipt extends TranslationProvenanceRecord {
  /** The source this translation is considered current against — written by a run, or by an editor accepting it as it stands. */
  sourceFingerprint: RecordedFingerprints | null;
}

/**
 * The composite key that identifies exactly one provenance record, and what every method of
 * {@link ProvenanceStore} but `findByDocument` matches on.
 *
 * @since 0.7.0
 */
export interface ProvenanceKey {
  collectionSlug: string;
  /** Stringified id of the translated document. */
  documentId: string;
  targetLocale: string;
}

/**
 * Storage port for translation provenance. The core depends only on this interface; the plugin
 * supplies a Payload-backed implementation. Kept minimal so it maps cleanly onto any store.
 *
 * @since 0.7.0
 *
 * @example
 * ```ts
 * const store: ProvenanceStore = new PayloadProvenanceStore(payload, "translator-provenance");
 * await store.upsert({
 *   collectionSlug: "posts",
 *   documentId: "42",
 *   targetLocale: "de",
 *   sourceLocale: "en",
 *   sourceFingerprint: fp,
 *   translatedAt: new Date().toISOString(),
 * });
 * const record = await store.find({ collectionSlug: "posts", documentId: "42", targetLocale: "de" });
 * ```
 */
export interface ProvenanceStore {
  /**
   * Write the whole receipt for its `(collectionSlug, documentId, targetLocale)` key, creating the
   * row when there is none. **Every column is replaced**, so this is only for a caller that owns all
   * of them: writing one field through here loses a translation that finished since the read — which
   * is what {@link ProvenanceStore.rebaseSourceFingerprint} exists for.
   */
  upsert(record: ProvenanceReceipt): Promise<void>;
  /**
   * Look up the record for a key.
   *
   * @param key - The `(collectionSlug, documentId, targetLocale)` identity.
   * @returns The stored record, or `null` if none exists.
   */
  find(key: ProvenanceKey): Promise<ProvenanceReceipt | null>;
  /**
   * List every record for a document — one per translated target locale. Backs #50's per-locale
   * staleness read for a single document panel.
   *
   * @param collectionSlug - Slug of the translated document's collection.
   * @param documentId - Stringified id of the translated document.
   * @returns All provenance receipts for the document (empty when none exist).
   */
  findByDocument(collectionSlug: string, documentId: string): Promise<ProvenanceReceipt[]>;
  /**
   * Re-base one record on the source it is now considered current against, touching nothing else.
   * No-op if the key has no record.
   *
   * Narrow on purpose: an editor accepting a translation reads the record, hashes the source and
   * writes, and a run finishing in between must keep its own `translatedAt` and its own claims
   * rather than be replaced by the snapshot the read took.
   */
  rebaseSourceFingerprint(
    key: ProvenanceKey,
    sourceFingerprint: RecordedFingerprints
  ): Promise<void>;
  /**
   * Delete every record for a document (all target locales). Used to cascade-clean when the source
   * document is deleted.
   *
   * @param collectionSlug - Slug of the deleted document's collection.
   * @param documentId - Stringified id of the deleted document.
   */
  deleteByDocument(collectionSlug: string, documentId: string): Promise<void>;
}
