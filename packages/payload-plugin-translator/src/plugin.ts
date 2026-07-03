import type { CollectionConfig, Config, Payload } from "payload";

import { CacheProviderExport } from "./client/app/cache/CacheProvider.export";
import {
  DEFAULT_PROVENANCE_SLUG,
  PayloadProvenanceStore,
  assertProvenanceSlugFree,
  isProvenanceCollection,
  makeProvenanceCollection,
} from "./server/modules/provenance";
import type { AccessGuard } from "./types/AccessGuard";
import type { TranslationProvider } from "./core/translation-providers";
import type {
  TaskRunnerProvider,
  TaskRunnerContext,
  TaskRunnerFactory,
} from "./server/modules/task-runner";
import { TranslateDocumentHandler } from "./server/features/translate-document";
import { documentLevel, collectionLevel } from "./composition/levels";
import type { TranslationLevel } from "./server/modules/translation-levels";
import { PluginConfigBuilder } from "./server/modules/translation-levels/PluginConfigBuilder";
import { normalizePath } from "./server/shared";

/**
 * Resolve the opt-in `provenance` config to a sidecar slug, or `null` when disabled.
 * `false`/omitted → off; `true` or `{}` → on with the default slug; `{ slug }` → on with that slug.
 */
function resolveProvenanceSlug(provenance: TranslatorPluginConfig["provenance"]): string | null {
  if (!provenance) return null;
  if (provenance === true) return DEFAULT_PROVENANCE_SLUG;
  // `||` (not `??`) so an empty/blank slug falls back to the default instead of silently disabling.
  return provenance.slug || DEFAULT_PROVENANCE_SLUG;
}

export type TranslatorPluginConfig = {
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
  /**
   * Which translation surfaces to enable, as level factories — `documentLevel()`,
   * `collectionLevel()`, `fieldLevel()`. Omit for the
   * default `[documentLevel(), collectionLevel()]`, which is exactly today's behaviour.
   * Each level should appear at most once: endpoints are deduplicated, but admin
   * components are not, so a duplicated level renders a duplicated control.
   * @default [documentLevel(), collectionLevel()]
   * @since 0.5.0
   */
  levels?: TranslationLevel[];
  /**
   * Opt-in translation provenance — a durable, per-locale record of what source state each
   * translation was derived from, stored in a plugin-managed sidecar collection. Set `true` (or `{}`)
   * to enable with the default slug, or `{ slug }` to customise it. Omit (or `false`) to disable
   * entirely — no collection, no migration, no behaviour change. **Enabling it on a SQL database adds
   * a table**: generate and run a migration (`payload migrate:create` + `payload migrate`; dev push in
   * development; MongoDB infers it with no migration). The lifecycle callbacks are unaffected by this
   * flag.
   * @since 0.7.0
   */
  provenance?:
    | boolean
    | {
        /**
         * Slug for the sidecar collection. Change it only to resolve a collision with an existing
         * collection.
         * @default 'translator-provenance'
         */
        slug?: string;
      };
};

/** @deprecated Use `TranslatorPluginConfig` instead */
export type TranslateCollectionPluginConfig = TranslatorPluginConfig;

/** @deprecated Use `translatorPlugin` function instead */
export class TranslateCollectionPlugin {
  private readonly pluginConfig: TranslatorPluginConfig;

  constructor(pluginConfig: TranslatorPluginConfig) {
    this.pluginConfig = pluginConfig;
  }

  init(): (config: Config) => Promise<Config> {
    return async (config) => {
      const {
        access,
        translationProvider,
        runner,
        collections,
        levels,
        provenance,
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
        collections.map((col) => [col.slug, JSON.parse(JSON.stringify(col.fields))])
      );
      const collectionSlugs = new Set(schemaMap.keys());
      const basePath = normalizePath(rawBasePath);

      // Provenance is opt-in: present `provenance` → resolve the slug, guard it against a collision
      // with a collection the consumer already defines (ignoring an already-added sidecar so repeated
      // plugin runs stay idempotent), and give the handler a factory that binds a store to the
      // request's Payload instance. Absent → no factory, no collection, no behaviour change.
      const provenanceSlug = resolveProvenanceSlug(provenance);
      if (provenanceSlug) {
        const existing = (config.collections ?? []).filter(
          (collection) => !isProvenanceCollection(collection)
        );
        assertProvenanceSlugFree(provenanceSlug, existing);
      }
      const provenanceStoreFactory = provenanceSlug
        ? (p: Payload) => new PayloadProvenanceStore(p, provenanceSlug)
        : undefined;

      const translateHandler = new TranslateDocumentHandler(
        translationProvider,
        schemaMap,
        provenanceStoreFactory
      );

      const runnerContext: TaskRunnerContext = {
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
        collections: Array.from(collectionSlugs),
      };
      const runnerConfigModifier = runner.configure(runnerContext);

      // Bind the context once so routes receive a self-sufficient factory: the
      // runner needs no mutable per-instance handler state and create() has no
      // "configure() must run first" ordering coupling (translator plan, 0c).
      const taskRunnerFactory: TaskRunnerFactory = {
        create: (payload) => runner.create(payload, runnerContext.handler),
      };

      const activeLevels = levels ?? [documentLevel(), collectionLevel()];
      const builder = new PluginConfigBuilder({
        collections,
        basePath,
        access,
        taskRunnerFactory,
        schemaMap,
        translationProvider,
      });
      for (const level of activeLevels) level.extend(builder);

      // Plugin-level contributions, routed through the same single config-writer:
      //  - the runner's jobs/autorun/onInit modifier (the builder applies it first,
      //    so a modifier returning a fresh config object doesn't drop later writes),
      //  - the always-on client cache provider.
      builder.addConfigModifier(runnerConfigModifier);
      if (provenanceSlug) {
        builder.addConfigModifier((cfg) => {
          const alreadyAdded = cfg.collections?.some(
            (collection) => collection.slug === provenanceSlug && isProvenanceCollection(collection)
          );
          if (!alreadyAdded) {
            cfg.collections = [
              ...(cfg.collections ?? []),
              makeProvenanceCollection(provenanceSlug),
            ];
          }
          return cfg;
        });
      }
      builder.addAdminProvider(new CacheProviderExport(basePath));

      // The single place the Payload config is mutated.
      return builder.applyTo(config);
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
