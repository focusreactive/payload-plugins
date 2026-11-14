import type { CollectionAfterChangeHook } from "payload";

/** The slice of a Payload collection that auto-translate's config-time wiring reads and mutates. */
export type AutoTranslateManagedEntry = {
  slug: string;
  hooks?: { afterChange?: CollectionAfterChangeHook[] };
  custom?: Record<string, unknown>;
};

export type AutoTranslateManagedConfig = {
  collections?: AutoTranslateManagedEntry[];
};
