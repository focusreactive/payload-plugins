import { TranslatorConfigError } from "../../../core/errors/index.js";

/**
 * Refuse a slug the consumer's own collections already use — one table written by both would corrupt
 * both. Exact string match only: `@payloadcms/drizzle` snake-cases slugs and `dbName` can override
 * them, so case and separator variants are not caught.
 */
export function assertRunRecordSlugFree(
  slug: string,
  collections: ReadonlyArray<{ slug: string }>
): void {
  if (collections.some((collection) => collection.slug === slug)) {
    throw new TranslatorConfigError(
      `[payload-plugin-translator] the run record slug "${slug}" collides with an existing collection. ` +
        "Set a distinct slug via the plugin's runs.slug option."
    );
  }
}
