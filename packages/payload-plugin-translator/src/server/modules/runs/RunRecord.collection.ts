import type { CollectionConfig } from "payload";

import type { ManagedCollectionsConfig } from "./RunRecord.shapes.js";

export const DEFAULT_RUNS_SLUG = "translator-runs";

const RUNS_MARKER = "translatorRuns";

/**
 * The plugin's own record of translation runs, one row per locale. A run covers several locales, so
 * `(handle, targetLng)` — not the handle — names a row, and that unique index is the upsert key.
 * `settledAt` carries its own index: "still owed" is the question these rows are read with.
 */
export function makeRunRecordCollection(slug: string = DEFAULT_RUNS_SLUG): CollectionConfig {
  return {
    slug,
    admin: { hidden: true },
    access: {
      read: () => false,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    custom: { [RUNS_MARKER]: true },
    fields: [
      { name: "handle", type: "text", required: true, index: true },
      { name: "collectionSlug", type: "text", required: true },
      { name: "collectionId", type: "text", required: true },
      { name: "sourceLng", type: "text", required: true },
      { name: "targetLng", type: "text", required: true },
      { name: "filters", type: "text" },
      { name: "publishOnTranslation", type: "checkbox", required: true },
      { name: "requesterId", type: "text" },
      { name: "requesterCollection", type: "text" },
      { name: "queuedAt", type: "date", required: true },
      { name: "startedAt", type: "date" },
      { name: "settledAt", type: "date", index: true },
      { name: "outcome", type: "text" },
      { name: "error", type: "text" },
      { name: "attempts", type: "number" },
    ],
    indexes: [
      { fields: ["handle", "targetLng"], unique: true },
      { fields: ["collectionSlug", "collectionId"] },
    ],
  };
}

/** True for the plugin's own record. Keyed on `custom`, not the slug, which the consumer may change. */
export function isRunRecordCollection(collection: { custom?: unknown }): boolean {
  return (collection.custom as Record<string, unknown> | undefined)?.[RUNS_MARKER] === true;
}

export function ensureRunRecordCollectionRegistered(
  host: ManagedCollectionsConfig,
  slug: string
): void {
  const alreadyAdded = host.collections?.some(
    (collection) => collection.slug === slug && isRunRecordCollection(collection)
  );
  if (!alreadyAdded) {
    host.collections = [...(host.collections ?? []), makeRunRecordCollection(slug)];
  }
}
