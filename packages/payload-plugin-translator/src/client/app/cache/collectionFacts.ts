import { resolveAutoTranslateSummary } from "../../entities/translation/model/autoTranslateSummary.server.js";
import type { LocaleCode } from "../../../types/wire/primitives.js";
import type { CollectionFacts } from "../../../types/wire/TranslateKitConfig.js";

type ManagedCollection = { slug: string; custom?: Record<string, unknown> };

/** Read off the registered collections, where auto-translate has already dropped locales the project lacks. */
export function collectionFacts(
  collections: readonly ManagedCollection[],
  defaultLocale: LocaleCode | undefined
): Record<string, CollectionFacts> {
  return Object.fromEntries(
    collections.map((collection) => [
      collection.slug,
      {
        autoTranslateTargets: resolveAutoTranslateSummary(collection, defaultLocale)?.targets ?? [],
      },
    ])
  );
}
