import type { SourceFingerprint } from "./SourceFingerprint.js";

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
 * The fingerprint columns are not here: how the plugin decides a locale is out of date is its own
 * business, and the staleness endpoint answers that question without them.
 *
 * @since 0.7.0
 */
export interface TranslationProvenanceRecord {
  /** Slug of the translated collection. */
  collectionSlug: string;
  /** Stringified id of the translated document. */
  documentId: string;
  /** Locale that was written (translated into). */
  targetLocale: string;
  /** Locale the translation was derived from. */
  sourceLocale: string;
  translatedAt: string;
}

/** The receipt as the plugin holds it: what a consumer sees, plus the fingerprints that drive staleness. */
export interface ProvenanceReceipt extends TranslationProvenanceRecord {
  sourceFingerprint: SourceFingerprint | null;
  /** The fingerprint an editor acknowledged as "stale but leave it" (#50). `null` until dismissed. */
  dismissedFingerprint: SourceFingerprint | null;
}

/**
 * The composite key that identifies exactly one provenance record. Also the {@link ProvenanceStore}
 * `upsert`/`find` match key.
 *
 * @since 0.7.0
 */
export interface ProvenanceKey {
  /** Slug of the translated collection. */
  collectionSlug: string;
  /** Stringified id of the translated document. */
  documentId: string;
  /** Locale that was written (translated into). */
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
 *   dismissedFingerprint: null,
 * });
 * const record = await store.find({ collectionSlug: "posts", documentId: "42", targetLocale: "de" });
 * ```
 */
export interface ProvenanceStore {
  /**
   * Create the record, or update it in place if one already exists for its
   * `(collectionSlug, documentId, targetLocale)` key. Never produces a duplicate for the same key.
   *
   * @param record - The provenance receipt to persist.
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
   * Acknowledge the current source drift for one locale without re-translating (#50's dismiss):
   * persist `dismissedFingerprint` so the indicator hides until the source changes again. No-op if
   * the key has no record.
   */
  dismiss(key: ProvenanceKey, dismissedFingerprint: SourceFingerprint): Promise<void>;
  /**
   * Delete every record for a document (all target locales). Used to cascade-clean when the source
   * document is deleted.
   *
   * @param collectionSlug - Slug of the deleted document's collection.
   * @param documentId - Stringified id of the deleted document.
   */
  deleteByDocument(collectionSlug: string, documentId: string): Promise<void>;
}
