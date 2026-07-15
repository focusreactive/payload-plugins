import type { CollectionConfig } from "payload";

import type { ManagedCollectionsConfig } from "./Provenance.shapes";

/** Default slug for the provenance sidecar collection. Overridable via `provenance.slug`. */
export const DEFAULT_PROVENANCE_SLUG = "translator-provenance";

/** The `custom` marker tagging the plugin's own provenance sidecar (set + read in this module). */
const PROVENANCE_MARKER = "translatorProvenance";

/**
 * Build the Payload config for the provenance sidecar collection.
 *
 * Deliberately minimal and DB-portable — only `text`/`date` fields and one composite index — so the
 * same config yields a trivial migration on SQL (Postgres/SQLite) and an inferred collection on
 * MongoDB. The collection is hidden from the admin UI: it is plugin-managed bookkeeping, not editor
 * content. The composite index on `(collectionSlug, documentId, targetLocale)` is the upsert key.
 *
 * The plugin ships only this config; the consumer's Payload creates the table (see the design doc's
 * SQL-migration note). Enabled only when the consumer opts in via `provenance`.
 */
export function makeProvenanceCollection(slug: string = DEFAULT_PROVENANCE_SLUG): CollectionConfig {
  return {
    slug,
    admin: { hidden: true },
    // Marker so plugin wiring can recognise its own collection ({@link isProvenanceCollection}) — lets
    // a repeated plugin run stay idempotent and lets the slug-collision guard ignore its own sidecar.
    custom: { [PROVENANCE_MARKER]: true },
    fields: [
      { name: "collectionSlug", type: "text", required: true, index: true },
      { name: "documentId", type: "text", required: true, index: true },
      { name: "targetLocale", type: "text", required: true },
      { name: "sourceLocale", type: "text", required: true },
      { name: "sourceFingerprint", type: "text", required: true },
      { name: "translatedAt", type: "date", required: true },
      { name: "dismissedFingerprint", type: "text" },
    ],
    indexes: [{ fields: ["collectionSlug", "documentId", "targetLocale"], unique: true }],
  };
}

/**
 * True for the plugin's own provenance sidecar collection. Recognised by the {@link PROVENANCE_MARKER}
 * on `custom` (not the slug, which is consumer-configurable), so plugin wiring can stay idempotent on
 * a repeated run and the slug-collision guard can ignore an already-added sidecar.
 */
export function isProvenanceCollection(collection: { custom?: unknown }): boolean {
  return (collection.custom as Record<string, unknown> | undefined)?.[PROVENANCE_MARKER] === true;
}

/**
 * Idempotently register the provenance sidecar collection on `host`: add it once, skipping when a
 * sidecar with this slug is already present, so a repeated `init()` never stacks a duplicate. Takes
 * only the narrow {@link ManagedCollectionsConfig} slice — a real Payload `Config` is structurally
 * assignable, and a test passes a plain `{ collections: [...] }` literal.
 */
export function ensureProvenanceCollectionRegistered(
  host: ManagedCollectionsConfig,
  slug: string
): void {
  const alreadyAdded = host.collections?.some(
    (collection) => collection.slug === slug && isProvenanceCollection(collection)
  );
  if (!alreadyAdded) {
    host.collections = [...(host.collections ?? []), makeProvenanceCollection(slug)];
  }
}
