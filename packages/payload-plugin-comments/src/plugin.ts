import type { Config, Plugin } from "payload";
import { baseCollection as getBaseCollection } from "./collection";
import type { CommentsPluginConfig } from "./types";
import { overrideCommentsCollection } from "./utils/config/overrideCommentsCollection";
import { getComponentPath } from "./utils/path/getComponentPath";
import { normalizeCollections } from "./utils/config/normalizeCollections";
import { mergeTranslations } from "./utils/config/mergeTranslations";
import { overrideCollections } from "./utils/config/overrideCollections";
import { overrideGlobals } from "./utils/config/overrideGlobals";

export const commentsPlugin =
  (config: CommentsPluginConfig = {}): Plugin =>
  (incomingConfig: Config): Config => {
    const { enabled = true, collections: collectionEntries, overrides, usernameFieldPath } = config;

    if (!enabled) {
      return incomingConfig;
    }

    const baseCollection = getBaseCollection(config.tenant);
    const finalCollection = overrideCommentsCollection(baseCollection, overrides);

    const allGlobalSlugs = (incomingConfig.globals ?? []).map((g) => g.slug);
    const allCollectionSlugs = (incomingConfig.collections ?? []).map((c) => c.slug);

    const normalizedCollections = normalizeCollections(collectionEntries);
    const documentTitleFields =
      normalizedCollections ?
        Object.fromEntries([...normalizedCollections.entries()].map(([k, v]) => [k, v.titleField]))
      : {};

    const userTranslations = config.translations ?? {};
    const incomingConfigTranslations = (incomingConfig.i18n?.translations as Record<string, object> | undefined) ?? {};

    const mergedTranslations = mergeTranslations(incomingConfigTranslations, userTranslations);

    return {
      ...incomingConfig,
      i18n: {
        ...incomingConfig.i18n,
        translations: mergedTranslations,
      },
      admin: {
        ...incomingConfig.admin,
        components: {
          ...incomingConfig.admin?.components,
          providers: [
            ...(incomingConfig.admin?.components?.providers ?? []),
            getComponentPath("providers/CommentsProviderWrapper", "CommentsProviderWrapper"),
            getComponentPath("providers/GlobalCommentsLoader", "GlobalCommentsLoader"),
          ],
          actions: [
            ...(incomingConfig.admin?.components?.actions ?? []),
            getComponentPath("components/CommentsHeaderButton", "CommentsHeaderButton"),
          ],
        },
        custom: {
          ...incomingConfig.admin?.custom,
          commentsPlugin: {
            collections: allCollectionSlugs,
            documentTitleFields,
            globals: allGlobalSlugs,
            tenant: config.tenant,
            usernameFieldPath,
          },
        },
      },
      collections: [...overrideCollections(incomingConfig.collections), finalCollection],
      globals: overrideGlobals(incomingConfig.globals),
    };
  };
