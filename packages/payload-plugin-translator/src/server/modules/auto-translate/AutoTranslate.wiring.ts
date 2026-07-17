import { getAutoTranslateConfig } from "../../../core/auto-translate-config";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import type { ConfigModifier } from "../../../types/ConfigModifier";
import type { TaskRunnerFactory } from "../task-runner";

import { makeCollectionPolicyResolver, normalizeAutoTranslateConfig } from "./AutoTranslate.policy";
import type { NormalizedAutoTranslatePolicy } from "./AutoTranslate.policy";
import { injectAutoTranslateHook, makeAutoTranslateHook } from "./AutoTranslateEnqueue.hook";

/** A collection as the plugin receives it — only `slug` + `custom` are read to resolve the opt-in. */
type ConfigurableCollection = { slug: string; custom?: Record<string, unknown> };

/** Everything the auto-translate module contributes at config time (mirrors `ProvenanceModule`). */
export type AutoTranslateModule = {
  configure(managedSlugs: Set<string>): ConfigModifier;
};

const NOOP: ConfigModifier = (config) => config;

/**
 * Turn the opt-in `withAutoTranslate` config (read from each collection's `custom`) into a
 * self-contained {@link AutoTranslateModule} — mirrors `configureProvenance`. Builds the per-collection
 * policy map + resolver once, then returns a `configure(managedSlugs) → ConfigModifier` that injects a
 * single best-effort `afterChange` hook onto every enabled + managed collection. When no collection
 * opted in, `configure` is a no-op (no hook, no behaviour change).
 */
export function configureAutoTranslate(
  collections: ConfigurableCollection[],
  schemaMap: CollectionSchemaMap,
  taskRunnerFactory: TaskRunnerFactory
): AutoTranslateModule {
  const policies = new Map<string, NormalizedAutoTranslatePolicy>();
  for (const collection of collections) {
    const config = getAutoTranslateConfig(collection);
    if (config) policies.set(collection.slug, normalizeAutoTranslateConfig(config));
  }
  if (policies.size === 0) return { configure: () => NOOP };

  const enabledSlugs = new Set(policies.keys());
  const resolvePolicy = makeCollectionPolicyResolver(policies);
  const hook = makeAutoTranslateHook({ resolvePolicy, schemaMap, taskRunnerFactory });

  return {
    configure:
      (managedSlugs: Set<string>): ConfigModifier =>
      (config) => {
        // Inject only onto collections that both opted in AND are plugin-managed.
        const slugs = new Set([...enabledSlugs].filter((slug) => managedSlugs.has(slug)));
        injectAutoTranslateHook(config, slugs, hook);
        return config;
      },
  };
}
