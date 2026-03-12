import type { Config, Plugin } from "payload";
import { baseCollection as getBaseCollection } from "./collection";
import type { CommentsPluginConfig } from "./types";
import { overrideCollection } from "./utils/config/overrideCollection";
import { getComponentPath } from "./utils/path/getComponentPath";
import { normalizeCollections } from "./utils/config/normalizeCollections";
import { injectFieldCommentComponents } from "./utils/config/injectFieldCommentComponents";
import { mergeTranslations } from "./utils/config/mergeTranslations";

export const commentsPlugin =
  (config: CommentsPluginConfig = {}): Plugin =>
  (incomingConfig: Config): Config => {
    const { enabled = true, collections: collectionEntries, overrides } = config;

    if (!enabled) {
      return incomingConfig;
    }

    const normalizedCollections = normalizeCollections(collectionEntries);
    const documentTitleFields =
      normalizedCollections ?
        Object.fromEntries([...normalizedCollections.entries()].map(([k, v]) => [k, v.titleField]))
      : {};

    const baseCollection = getBaseCollection(config.tenant);
    const finalCollection = overrideCollection(baseCollection, overrides);

    const allCollectionSlugs = (incomingConfig.collections ?? []).map((c) => c.slug);

    const patchedCollections = (incomingConfig.collections ?? []).map((collection) =>
      injectFieldCommentComponents(collection),
    );

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
            tenant: config.tenant,
          },
        },
      },
      collections: [...patchedCollections, finalCollection],
    };
  };
