import type { CollectionConfig } from "payload";

import type { ManagedCollectionsConfig } from "./Provenance.shapes";

export const DEFAULT_PROVENANCE_SLUG = "translator-provenance";

const PROVENANCE_MARKER = "translatorProvenance";

/**
 * Provenance sidecar collection. Only `text`/`date` fields and one composite index, so the same
 * config works on Postgres, SQLite and Mongo; the unique `(collectionSlug, documentId, targetLocale)`
 * index is the upsert key.
 */
export function makeProvenanceCollection(slug: string = DEFAULT_PROVENANCE_SLUG): CollectionConfig {
  return {
    slug,
    admin: { hidden: true },
    // Payload's default is any signed-in user, and `admin.hidden` does not cover `/api/<slug>`. The
    // plugin's own reads and writes go through the Local API, which does not consult these rules.
    access: {
      read: () => false,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
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

/** True for the plugin's own sidecar. Keyed on `custom`, not the slug, which the consumer may change. */
export function isProvenanceCollection(collection: { custom?: unknown }): boolean {
  return (collection.custom as Record<string, unknown> | undefined)?.[PROVENANCE_MARKER] === true;
}

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
