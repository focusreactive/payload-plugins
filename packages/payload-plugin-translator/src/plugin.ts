import type { CollectionConfig, Config } from "payload";

import { CacheProviderExport } from "./client/app/cache/CacheProvider.export";
import { BulkDocumentTranslationDashboard } from "./client/widgets/bulk-translation-dashboard/ui/BulkTranslationDashboard.export";
import { TranslateDocumentExport } from "./client/widgets/translate-document";
import { createCancelRoute } from "./server/features/cancel";
import { createCancelByCollectionRoute } from "./server/features/cancel-by-collection";
import { createEnqueueRoute } from "./server/features/enqueue-translation";
import { createGetCollectionStatusRoute } from "./server/features/get-collection-status";
import { createGetDocumentStatusRoute } from "./server/features/get-document-status";
import { createRunRoute } from "./server/features/run-translation";
import { TranslateDocumentHandler } from "./server/features/translate-document";
import type { TaskRunnerProvider } from "./server/modules/task-runner";
import type { TranslationProvider } from "./server/modules/translation-providers";
import { normalizePath, pipe } from "./server/shared";
import type { AccessGuard } from "./types/AccessGuard";

export interface TranslatorPluginConfig {
  /**
   * Original collection configs (same objects passed to buildConfig).
   * IMPORTANT: Must be the original collection objects, NOT sanitized configs from payload.collections.
   * Original schemas preserve `localized: true` on nested fields.
   */
  collections: CollectionConfig[];
  /**
   * Translation provider implementation (e.g., OpenAI, DeepL).
   * Handles the actual text translation.
   */
  translationProvider: TranslationProvider;
  /**
   * Task runner backend for background task execution.
   * Use createPayloadJobsRunner() for Payload Jobs integration.
   */
  runner: TaskRunnerProvider;
  /**
   * Access guard for translation endpoints.
   * Controls who can trigger translations via API.
   * @default undefined (no access restrictions)
   */
  access?: AccessGuard;
  /**
   * Base path for all translation API endpoints.
   * Useful to avoid conflicts with existing routes.
   * @example '/my-translate' results in '/my-translate/enqueue', '/my-translate/run/:id', etc.
   * @default '/translate'
   */
  basePath?: string;
}

/** @deprecated Use `TranslatorPluginConfig` instead */
export type TranslateCollectionPluginConfig = TranslatorPluginConfig;

/** @deprecated Use `translatorPlugin` function instead */
export class TranslateCollectionPlugin {
  constructor(private readonly pluginConfig: TranslatorPluginConfig) {}

  init(): (config: Config) => Promise<Config> {
    return async (config) => {
      const {
        access,
        translationProvider,
        basePath: rawBasePath = "/translate",
      } = this.pluginConfig;

      // Build schema map from deep-cloned collections
      // Deep clone is required because Payload mutates the original collection objects,
      // removing `localized: true` from nested fields during sanitization.
      // We use JSON round-trip instead of structuredClone because Lexical editor
      // configs contain async functions that structuredClone cannot handle.
      // TODO: Consider introducing a FieldLike interface with only the properties
      // used by the pipeline (name, type, localized, fields, blocks, tabs, custom)
      // to make the contract explicit and avoid reliance on JSON round-trip.
      const schemaMap = new Map(
        this.pluginConfig.collections.map((col) => [
          col.slug,
          JSON.parse(JSON.stringify(col.fields)),
        ])
      );
      const collectionSlugs = new Set(schemaMap.keys());
      const basePath = normalizePath(rawBasePath);
      const translateHandler = new TranslateDocumentHandler(
        translationProvider,
        schemaMap
      );

      const runnerConfigModifier = this.pluginConfig.runner.configure({
        collections: Array.from(collectionSlugs),
        handler: async (payload, input) => {
          await translateHandler.handle(payload, {
            collection: input.collection,
            collectionId: input.collectionId,
            sourceLng: input.sourceLng,
            targetLng: input.targetLng,
            strategy: input.strategy,
            publishOnTranslation: input.publishOnTranslation,
          });
        },
      });

      return pipe<Config>(
        // 1. Set up UI component provider import
        (cfg) => {
          if (!cfg.admin) {cfg.admin = {};}
          if (!cfg.admin.components) {cfg.admin.components = {};}
          if (!cfg.admin.components.providers)
            {cfg.admin.components.providers = [];}

          cfg.admin.components.providers.push(
            new CacheProviderExport(basePath)
          );
          return cfg;
        },

        // 2. Set up UI component import
        (cfg) => {
          cfg.collections?.forEach((collection) => {
            if (!collectionSlugs.has(collection.slug)) {
              return;
            }

            if (!collection.admin) {collection.admin = {};}
            if (!collection.admin.components) {collection.admin.components = {};}
            if (!collection.admin.components.edit)
              {collection.admin.components.edit = {};}
            if (!collection.admin.components.edit.beforeDocumentControls) {
              collection.admin.components.edit.beforeDocumentControls = [];
            }
            if (!collection.admin.components.beforeListTable) {
              collection.admin.components.beforeListTable = [];
            }

            collection.admin.components.edit.beforeDocumentControls.push(
              new TranslateDocumentExport(collection, access)
            );
            collection.admin.components.beforeListTable.push(
              new BulkDocumentTranslationDashboard(access)
            );
          });
          return cfg;
        },

        // 3. Runner configures jobs/tasks/autorun
        runnerConfigModifier,

        // 4. Add global endpoints
        (cfg) => {
          if (!cfg.endpoints) {cfg.endpoints = [];}
          const collectionConfig = { availableCollections: collectionSlugs };
          cfg.endpoints.push(
            createEnqueueRoute(
                this.pluginConfig.runner,
                collectionConfig,
                access,
                basePath
              ),
              createRunRoute(this.pluginConfig.runner, access, basePath),
              createCancelRoute(this.pluginConfig.runner, access, basePath),
              createCancelByCollectionRoute(
                collectionConfig,
                this.pluginConfig.runner,
                access,
                basePath
              ),
              createGetDocumentStatusRoute(
                collectionConfig,
                this.pluginConfig.runner,
                access,
                basePath
              ),
              createGetCollectionStatusRoute(
                collectionConfig,
                this.pluginConfig.runner,
                access,
                basePath
              )
          );
          return cfg;
        }
      )(config);
    };
  }
}

/**
 * Creates a translation plugin for Payload CMS collections.
 *
 * @example
 * ```ts
 * export default buildConfig({
 *   plugins: [
 *     translatorPlugin({
 *       collections: [Posts, Pages],
 *       translationProvider: createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
 *       runner: createPayloadJobsRunner(),
 *     }),
 *   ],
 * })
 * ```
 */
export function translatorPlugin(
  config: TranslatorPluginConfig
): (config: Config) => Promise<Config> {
  return new TranslateCollectionPlugin(config).init();
}

/** @deprecated Use `translatorPlugin` instead */
export const createTranslatePlugin = translatorPlugin;
