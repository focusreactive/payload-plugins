import type { CollectionConfig, Config } from "payload";

import { CacheProviderExport } from "./client/app/cache/CacheProvider.export";
import { configureAutoTranslate } from "./server/modules/auto-translate";
import { configureProvenance } from "./server/modules/provenance";
import type { AccessGuard } from "./types/AccessGuard";
import type { CollectionSchemaMap } from "./types/CollectionSchemaMap";
import type { TargetSelectionMode } from "./types/TargetSelection";
import { projectFieldsToFieldLike } from "./core/kernel/field-traversal";
import type { TranslationProvider } from "./core/domain/translation-providers";
import type { TaskRunnerProvider } from "./server/modules/task-runner";
import { wireTranslateRunner } from "./server/features/translate-document";
import type { TranslationLifecycleCallbacks } from "./server/modules/lifecycle";
import { documentLevel, collectionLevel } from "./composition/levels";
import type { TranslationLevel } from "./server/modules/translation-levels";
import { PluginConfigBuilder } from "./server/modules/translation-levels/PluginConfigBuilder";
import { normalizePath } from "./server/shared";

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
  /**
   * Optional server-side lifecycle callbacks fired around each translation task
   * (`onQueued` / `onCompleted` / `onFailed`). Always available — no schema, no migration, not gated
   * by `provenance`. A throwing callback is caught and logged, never failing the translation.
   * @since 0.7.0
   */
  lifecycle?: TranslationLifecycleCallbacks;
  /**
   * How the target-language field behaves in the translation forms. `'single'` (default) keeps
   * today's one-locale-per-run behaviour, byte-identical. `'multi'` renders a compact multi-select so
   * an editor can queue several target locales in one run — the run fans out one translation per
   * `(document × target locale)`. Opt-in and fully backward-compatible; no schema, no migration.
   * @default 'single'
   * @since 0.10.0
   */
  targetSelection?: TargetSelectionMode;
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
        lifecycle,
        targetSelection = "single",
        basePath: rawBasePath = "/translate",
      } = this.pluginConfig;

      // Snapshot each collection's schema as an independent FieldLike tree BEFORE Payload's sanitizer
      // mutates the originals (it deletes `localized` from fields nested under a localized ancestor).
      // `projectFieldsToFieldLike` deep-copies only the properties the pipeline reads — an explicit,
      // typed contract, replacing the old JSON round-trip (which "worked" only by silently dropping the
      // Lexical editor's async functions that structuredClone chokes on). Payload's `Field[]` is
      // structurally assignable to `FieldLike[]`, so the projection happens right here at the boundary.
      const schemaMap: CollectionSchemaMap = new Map(
        collections.map((col) => [col.slug, projectFieldsToFieldLike(col.fields)])
      );
      const collectionSlugs = new Set(schemaMap.keys());
      const basePath = normalizePath(rawBasePath);

      // Each concern owns its own config-time wiring and exposes it uniformly; init() just composes.
      const provenanceModule = configureProvenance(provenance, schemaMap);
      const { taskRunnerFactory, configModifier: runnerConfigModifier } = wireTranslateRunner({
        translationProvider,
        schemaMap,
        provenanceServiceFactory: provenanceModule.serviceFactory,
        runner,
        lifecycle: lifecycle ?? {},
        collections: Array.from(collectionSlugs),
      });
      // Auto-translate (#51) reads its opt-in from each collection's `custom` (via `withAutoTranslate`);
      // needs the runner's factory, so it wires after `wireTranslateRunner`.
      const autoTranslateModule = configureAutoTranslate(collections, schemaMap, taskRunnerFactory);

      const activeLevels = levels ?? [documentLevel(), collectionLevel()];
      const builder = new PluginConfigBuilder({
        collections,
        basePath,
        access,
        taskRunnerFactory,
        schemaMap,
        translationProvider,
        provenanceServiceFactory: provenanceModule.serviceFactory,
        targetSelection,
      });
      for (const level of activeLevels) level.extend(builder);

      builder.addConfigModifier(runnerConfigModifier);
      builder.addConfigModifier(provenanceModule.configure(collectionSlugs));
      builder.addConfigModifier(autoTranslateModule.configure(collectionSlugs));
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
