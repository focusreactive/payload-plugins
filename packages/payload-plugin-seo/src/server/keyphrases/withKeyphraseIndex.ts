import type { Config } from "payload";
import { DEFAULT_LOCALES } from "../../constants";
import type { SeoPluginConfig } from "../../types/config";
import { createLinkSuggestionsEndpoint } from "../links/endpoint";
import { createKeyphraseCleanupHook } from "./cleanupHook";
import { createKeyphraseCollection } from "./collection";
import { createKeyphraseEndpoints } from "./endpoints";
import type { KeyphraseScope } from "./types";

export function withKeyphraseIndex(incoming: Config, config: SeoPluginConfig): Config {
  if (!config.keyphraseIndex) return incoming;

  const indexedSlugs = config.collections.map((c) => c.slug);
  const scope: KeyphraseScope = {
    collections: indexedSlugs,
    locales: config.supportedLocales ?? DEFAULT_LOCALES,
  };

  const collections = (incoming.collections ?? []).map((collection) => {
    if (!indexedSlugs.includes(collection.slug)) return collection;

    return {
      ...collection,
      hooks: {
        ...collection.hooks,
        afterDelete: [
          ...(collection.hooks?.afterDelete ?? []),
          createKeyphraseCleanupHook(collection.slug),
        ],
      },
    };
  });

  return {
    ...incoming,
    collections: [...collections, createKeyphraseCollection()],
    endpoints: [
      ...(incoming.endpoints ?? []),
      ...createKeyphraseEndpoints(scope),
      createLinkSuggestionsEndpoint(scope),
    ],
  };
}
