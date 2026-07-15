import type { CollectionAfterDeleteHook } from "payload";

/**
 * The minimal slice of a Payload collection that provenance's config-time wiring reads and mutates:
 * its `slug`, the sidecar `custom` marker, and the `afterDelete` hook slot. A real `CollectionConfig`
 * is **structurally assignable** to this — call sites pass the live collection with no adapter, and a
 * test passes a plain `{ slug: "posts" }` literal. Keeps `injectProvenanceCleanup` /
 * `ensureProvenanceCollectionRegistered` off the god-`Config`/`CollectionConfig` types.
 *
 * The only Payload type imported here is `CollectionAfterDeleteHook` — a framework callback contract
 * that legitimately stays framework-typed.
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
