import type { CollectionAfterChangeHook } from "payload";

/**
 * The minimal slice of a Payload collection the auto-translate wiring mutates: its `slug` and the
 * `afterChange` hook slot. A real `CollectionConfig` is structurally assignable to this, so call sites
 * pass the live collection with no adapter and tests pass a `{ slug: "posts" }` literal. Keeps
 * `injectAutoTranslateHook` off the god-`CollectionConfig` type (own shape — provenance's is not reused,
 * per the module-owns-its-shape convention). The only Payload type imported is the hook callback
 * contract, which legitimately stays framework-typed.
 */
export type AutoTranslateManagedEntry = {
  slug: string;
  hooks?: { afterChange?: CollectionAfterChangeHook[] };
};

/** The minimal config host: a mutable `collections` array. A real Payload `Config` plugs straight in. */
export type AutoTranslateManagedConfig = {
  collections?: AutoTranslateManagedEntry[];
};
