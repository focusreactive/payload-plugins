import type { CollectionAfterDeleteHook, CollectionSlug } from "payload";

/**
 * The slice of a Payload collection provenance's config-time wiring reads and mutates. A real
 * `CollectionConfig` is structurally assignable, so call sites pass the live collection and tests
 * pass `{ slug: "posts" }`.
 */
export type ManagedCollectionEntry = {
  slug: string;
  custom?: unknown;
  hooks?: { afterDelete?: CollectionAfterDeleteHook[] };
};

/**
 * The minimal config host provenance's config-time wiring touches: just a mutable `collections`
 * array. A real Payload `Config` plugs straight in (its `collections?: CollectionConfig[]` satisfies
 * `ManagedCollectionEntry[]`).
 */
export type ManagedCollectionsConfig = {
  collections?: ManagedCollectionEntry[];
};

export type ProvenanceLogger = {
  error(details: Record<string, unknown>): void;
};

/**
 * Reading the source document a translation was made from, bound to a Payload instance by the wiring.
 *
 * `null` means not available to this caller, and deliberately does not distinguish refused from absent.
 */
export type SourceDocumentReader = (query: {
  collection: CollectionSlug;
  id: string;
  locale: string;
  user: Record<string, unknown> | null;
}) => Promise<Record<string, unknown> | null>;
