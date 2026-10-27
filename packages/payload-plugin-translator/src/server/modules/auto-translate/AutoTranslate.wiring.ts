import {
  AUTO_TRANSLATE_CUSTOM_KEY,
  getAutoTranslateConfig,
} from "../../../core/domain/auto-translate/index.js";
import { Locales } from "../../../core/domain/locales/index.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { ConfigModifier } from "../../../types/ConfigModifier.js";
import type { TaskRunnerFactory } from "../task-runner/index.js";
import type { RunRecordStoreFactory } from "../runs/index.js";

import {
  filterPolicyToKnownLocales,
  makeCollectionPolicyResolver,
  normalizeAutoTranslateConfig,
} from "./AutoTranslate.policy.js";
import type { NormalizedAutoTranslatePolicy } from "./AutoTranslate.policy.js";
import {
  injectAutoTranslateHook,
  makeAutoTranslateHook,
  propagateAutoTranslateCustom,
} from "./AutoTranslateEnqueue.hook.js";

type ConfigurableCollection = { slug: string; custom?: Record<string, unknown> };

export type AutoTranslateModule = {
  configure(managedSlugs: Set<string>): ConfigModifier;
};

const NOOP: ConfigModifier = (config) => config;

function warnDroppedLocales(
  slug: string,
  filtered: ReturnType<typeof filterPolicyToKnownLocales>,
  knownLocales: Set<string>
): void {
  const known = [...knownLocales].join(", ");
  if (filtered.droppedTargets.length > 0) {
    console.warn(
      `[payload-plugin-translator] auto-translate on "${slug}": ignoring unknown target locale(s) ${filtered.droppedTargets.join(", ")} (configured locales: ${known}).`
    );
  }
  if (filtered.droppedSourceLocale) {
    console.warn(
      `[payload-plugin-translator] auto-translate on "${slug}": unknown sourceLocale "${filtered.droppedSourceLocale}" ignored, falling back to the default locale (configured locales: ${known}).`
    );
  }
}

/**
 * Runs while the config is still being built, so a locale nobody configured is dropped before the
 * first hook can enqueue a translation for it — after that it would cost provider calls and leave
 * translations under a locale the project cannot serve.
 */
function dropLocalesTheProjectDoesNotHave(
  config: { localization?: Locales.LocalizationLike },
  slugs: Set<string>,
  policies: Map<string, NormalizedAutoTranslatePolicy>
): void {
  const knownLocales = Locales.knownCodes(config.localization);
  if (!knownLocales) {
    if (slugs.size > 0) {
      console.warn(
        "[payload-plugin-translator] auto-translate is configured but localization is disabled; no translations will be enqueued."
      );
    }
    return;
  }
  for (const slug of slugs) {
    const policy = policies.get(slug);
    if (!policy) continue;
    const filtered = filterPolicyToKnownLocales(policy, knownLocales);
    warnDroppedLocales(slug, filtered, knownLocales);
    policies.set(slug, filtered.policy);
  }
}

/**
 * A removed option must not become a silent no-op: `strategy: "skip_existing"` kept an automatic run
 * to the drifted leaves, and a run now covers the whole document — so a host that believes the
 * option still holds overwrites reviewed text on every source save.
 * See docs/DEPRECATIONS.md#the-strategy-leaves-the-run
 */
function warnAboutTheRemovedStrategy(collections: ConfigurableCollection[]): void {
  for (const collection of collections) {
    const raw = collection.custom?.[AUTO_TRANSLATE_CUSTOM_KEY];
    if (typeof raw !== "object" || raw === null) continue;
    if (!("strategy" in raw)) continue;

    console.warn(
      `[payload-plugin-translator] auto-translate on "${collection.slug}": \`strategy\` was removed and is ignored. An automatic run now translates the whole document — see docs/DEPRECATIONS.md#the-strategy-leaves-the-run.`
    );
  }
}

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
  taskRunnerFactory: TaskRunnerFactory,
  runRecordStoreFactory: RunRecordStoreFactory
): AutoTranslateModule {
  warnAboutTheRemovedStrategy(collections);

  const policies = new Map<string, NormalizedAutoTranslatePolicy>();
  for (const collection of collections) {
    const config = getAutoTranslateConfig(collection);
    if (config) policies.set(collection.slug, normalizeAutoTranslateConfig(config));
  }
  if (policies.size === 0) return { configure: () => NOOP };

  const enabledSlugs = new Set(policies.keys());
  const resolvePolicy = makeCollectionPolicyResolver(policies);
  const hook = makeAutoTranslateHook({
    resolvePolicy,
    schemaMap,
    taskRunnerFactory,
    runRecordStoreFactory,
  });

  return {
    configure:
      (managedSlugs: Set<string>): ConfigModifier =>
      (config) => {
        const slugs = new Set([...enabledSlugs].filter((slug) => managedSlugs.has(slug)));
        dropLocalesTheProjectDoesNotHave(config, slugs, policies);
        injectAutoTranslateHook(config, slugs, hook);
        propagateAutoTranslateCustom(config, slugs, policies);
        return config;
      },
  };
}
