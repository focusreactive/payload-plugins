import { TranslatorConfigError } from "../../../core/errors/index.js";

/**
 * Fail fast if the provenance sidecar slug collides with a collection the consumer already defines —
 * sharing a table would silently corrupt both.
 *
 * Exact-slug comparison only: it does not model `@payloadcms/drizzle`'s snake-casing or `dbName`
 * overrides, so case and separator variants go undetected.
 */
export function assertProvenanceSlugFree(
  slug: string,
  collections: ReadonlyArray<{ slug: string }>
): void {
  if (collections.some((collection) => collection.slug === slug)) {
    throw new TranslatorConfigError(
      `[payload-plugin-translator] provenance slug "${slug}" collides with an existing collection. ` +
        "Set a distinct slug via the plugin's provenance.slug option."
    );
  }
}
