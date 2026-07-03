/**
 * Fail fast if the provenance sidecar slug collides with a collection the consumer already defines.
 * Sharing a table would silently corrupt both — better a clear startup error telling the consumer to
 * set `provenance.slug`.
 *
 * Compares by exact slug: this catches the common footgun — a consumer collection already using this
 * slug — and is correct on every adapter (on MongoDB the slug IS the collection name). It does NOT
 * try to model SQL table-name derivation: `@payloadcms/drizzle` snake-cases slugs and honours
 * `dbName` overrides, so case/separator variants (`translatorProvenance` vs `translator-provenance`)
 * or `dbName` collisions are not detected here. Robust table-name collision detection, if it proves
 * necessary, belongs at plugin init where the full `CollectionConfig` (including `dbName`) is
 * available — not in this slug-only helper.
 */
export function assertProvenanceSlugFree(
  slug: string,
  collections: ReadonlyArray<{ slug: string }>
): void {
  if (collections.some((collection) => collection.slug === slug)) {
    throw new Error(
      `[payload-plugin-translator] provenance slug "${slug}" collides with an existing collection. ` +
        "Set a distinct slug via the plugin's provenance.slug option."
    );
  }
}
