import type { CollectionAfterChangeHook } from "payload";

import { hasSourceContentChanged } from "../../../core/domain/auto-translate";
import { AUTO_TRANSLATE_CUSTOM_KEY } from "../../../core/domain/auto-translate";
import { AUTO_TRANSLATE_SKIP_CONTEXT_KEY } from "../../../types/AutoTranslateContext";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import type { TaskRunnerFactory } from "../task-runner";

import type {
  AutoTranslatePolicyResolver,
  NormalizedAutoTranslatePolicy,
} from "./AutoTranslate.policy";
import { buildAutoTranslateTasks, passesPublishGate } from "./AutoTranslate.policy";
import type { AutoTranslateManagedConfig } from "./AutoTranslate.shapes";

/**
 * Marks the plugin's own auto-translate hook so a repeated `init()` recognises an already-injected hook
 * and stays idempotent (same idea as the provenance cleanup hook's marker). A bare function has no
 * `custom` bag, so the marker lives as a property on the function itself.
 */
type MarkedHook = CollectionAfterChangeHook & { __translatorAutoTranslate?: boolean };

type AutoTranslateHookDeps = {
  resolvePolicy: AutoTranslatePolicyResolver;
  schemaMap: CollectionSchemaMap;
  taskRunnerFactory: TaskRunnerFactory;
};

/**
 * Build the `afterChange` hook that auto-enqueues translations when a document's source-locale content
 * changes. Thin orchestration only — every decision lives in `AutoTranslate.policy.ts` or the core
 * drift predicate. Best-effort by contract: any failure is logged and swallowed, never failing the
 * editor's save.
 *
 * Order (cheap guards first): (1) skip the translator's own writes via the `req.context` flag;
 * (2) resolve the policy — off ⇒ skip; (3) resolve the source locale (per-collection override else
 * `localization.defaultLocale`) — unresolved ⇒ log + skip; (4) skip non-source-locale writes (the
 * pipeline's target writes never match); (5) publish-gate (D8); (6) drift-gate (D3); then enqueue one
 * job per target locale.
 */
export function makeAutoTranslateHook(deps: AutoTranslateHookDeps): CollectionAfterChangeHook {
  const { resolvePolicy, schemaMap, taskRunnerFactory } = deps;

  const hook: MarkedHook = async ({ doc, previousDoc, req, collection }) => {
    try {
      if (req.context?.[AUTO_TRANSLATE_SKIP_CONTEXT_KEY]) return doc;

      const policy = resolvePolicy(collection.slug, doc);
      if (!policy) return doc;

      const localization = req.payload.config.localization;
      const sourceLocale =
        policy.sourceLocale ?? (localization ? localization.defaultLocale : undefined);
      if (!sourceLocale) {
        req.payload.logger.warn({
          collection: collection.slug,
          documentId: String(doc.id),
          msg: "translator: auto-translate skipped — no source locale resolvable (set localization.defaultLocale or a per-collection sourceLocale)",
        });
        return doc;
      }

      if (req.locale !== sourceLocale) return doc;

      const hasDrafts = Boolean(collection.versions && collection.versions.drafts);
      if (!passesPublishGate(doc, hasDrafts)) return doc;

      const schema = schemaMap.get(collection.slug);
      if (schema && !hasSourceContentChanged(previousDoc, doc, schema)) return doc;

      const tasks = buildAutoTranslateTasks({
        policy,
        collectionSlug: collection.slug,
        documentId: String(doc.id),
        sourceLocale,
        doc,
        hasDrafts,
        now: Date.now(),
      });
      if (tasks.length === 0) return doc;

      await taskRunnerFactory.create(req.payload).enqueue(tasks);
    } catch (error) {
      req.payload.logger.error({
        err: error,
        collection: collection.slug,
        documentId: String(doc.id),
        msg: "translator: auto-translate hook failed",
      });
    }
    return doc;
  };

  hook.__translatorAutoTranslate = true;
  return hook;
}

/**
 * Attach the auto-translate hook to every enabled collection on `config`, appending to any
 * consumer-supplied `afterChange` array. Idempotent: a collection that already carries the marked hook
 * is skipped, so a repeated `init()` never stacks duplicates.
 */
export function injectAutoTranslateHook(
  config: AutoTranslateManagedConfig,
  enabledSlugs: Set<string>,
  hook: CollectionAfterChangeHook
): void {
  for (const collection of config.collections ?? []) {
    if (!enabledSlugs.has(collection.slug)) continue;
    collection.hooks ??= {};
    collection.hooks.afterChange ??= [];
    const alreadyInjected = collection.hooks.afterChange.some(
      (existing) => (existing as MarkedHook).__translatorAutoTranslate === true
    );
    if (!alreadyInjected) collection.hooks.afterChange.push(hook);
  }
}

/**
 * Propagate each enabled collection's resolved policy onto the REGISTERED collection's `custom` bag, so
 * the admin UI can read the opt-in back via `getAutoTranslateConfig`. This is required because
 * `withAutoTranslate` stamps `custom` on the object passed to the plugin's `collections` param, which
 * can be a DIFFERENT object than the one registered in `buildConfig.collections` (the reader would
 * otherwise see no config and the indicator would disagree with the behaviour). Idempotent + additive:
 * re-stamping the same value is a no-op and the behaviour wiring still reads from the plugin param.
 */
export function propagateAutoTranslateCustom(
  config: AutoTranslateManagedConfig,
  enabledSlugs: Set<string>,
  policies: Map<string, NormalizedAutoTranslatePolicy>
): void {
  for (const collection of config.collections ?? []) {
    if (!enabledSlugs.has(collection.slug)) continue;
    const policy = policies.get(collection.slug);
    if (!policy) continue;
    collection.custom = {
      ...(collection.custom ?? {}),
      [AUTO_TRANSLATE_CUSTOM_KEY]: policy,
    };
  }
}
