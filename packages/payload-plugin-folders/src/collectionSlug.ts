import type { CollectionSlug } from "payload";

/**
 * The plugin's slugs are chosen at runtime, so they cannot be members of the host's generated
 * `CollectionSlug` union; this is the one place that says so.
 */
export const toCollectionSlug = (slug: string): CollectionSlug => slug as CollectionSlug;
