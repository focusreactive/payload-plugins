import type { CollectionAfterChangeHook } from "payload";
import { hasDraftsEnabled } from "payload/shared";

import { authCollectionsOf, identityOf } from "../../shared/payload/identityOf.js";
import { swallowOrThrow } from "../../shared/payload/swallowOrThrow.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";

import { hasSourceContentChanged } from "../../../core/domain/auto-translate/index.js";
import { AUTO_TRANSLATE_CUSTOM_KEY } from "../../../core/domain/auto-translate/index.js";
import { AUTO_TRANSLATE_SKIP_CONTEXT_KEY } from "../../../types/AutoTranslateContext.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { TaskRunnerFactory } from "../task-runner/index.js";

import type {
  AutoTranslatePolicyResolver,
  NormalizedAutoTranslatePolicy,
} from "./AutoTranslate.policy.js";
import { buildAutoTranslateTasks, passesPublishGate } from "./AutoTranslate.policy.js";
import type { AutoTranslateManagedConfig } from "./AutoTranslate.shapes.js";

/** A hook is a bare function with no `custom` bag, so the idempotency marker lives on the function itself. */
type MarkedHook = CollectionAfterChangeHook & { __translatorAutoTranslate?: boolean };

type AutoTranslateHookDeps = {
  resolvePolicy: AutoTranslatePolicyResolver;
  schemaMap: CollectionSchemaMap;
  taskRunnerFactory: TaskRunnerFactory;
};

/** `afterChange` hook that enqueues translations when a document's source-locale content changes. */
export function makeAutoTranslateHook(deps: AutoTranslateHookDeps): CollectionAfterChangeHook {
  const { resolvePolicy, schemaMap, taskRunnerFactory } = deps;

  const hook: MarkedHook = async ({ doc, previousDoc, req, collection }) => {
    const transactionID = await req.transactionID;
    const scope: RequestScope = transactionID == null ? {} : { transactionID };

    await swallowOrThrow(
      scope,
      async () => {
        const skipAutoTranslate = req.context?.[AUTO_TRANSLATE_SKIP_CONTEXT_KEY];
        const localization = req.payload.config.localization;

        if (skipAutoTranslate) return;

        const policy = resolvePolicy(collection.slug, doc);
        if (!policy) return;

        const sourceLocale =
          policy.sourceLocale ?? (localization ? localization.defaultLocale : undefined);
        if (!sourceLocale) {
          req.payload.logger.warn({
            collection: collection.slug,
            documentId: String(doc.id),
            msg: "translator: auto-translate skipped — no source locale resolvable (set localization.defaultLocale or a per-collection sourceLocale)",
          });
          return;
        }

        if (req.locale !== sourceLocale) return;

        const hasDrafts = hasDraftsEnabled(collection);
        if (!passesPublishGate(doc, hasDrafts)) return;

        const schema = schemaMap.get(collection.slug);
        if (schema && !hasSourceContentChanged(previousDoc, doc, schema)) return;

        const tasks = buildAutoTranslateTasks({
          policy,
          collectionSlug: collection.slug,
          documentId: String(doc.id),
          sourceLocale,
          doc,
          hasDrafts,
          now: Date.now(),
        });
        if (tasks.length === 0) return;

        await taskRunnerFactory.create(req.payload).enqueue(tasks, {
          ...scope,
          ...identityOf(req, authCollectionsOf(req.payload), req.payload.logger),
        });
      },
      (error) =>
        req.payload.logger.error({
          err: error,
          collection: collection.slug,
          documentId: String(doc.id),
          msg: "translator: auto-translate hook failed",
        })
    );

    return doc;
  };

  hook.__translatorAutoTranslate = true;
  return hook;
}

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
 * `withAutoTranslate` stamps `custom` on the object handed to the plugin's `collections` param, which
 * may not be the object Payload registered — so the resolved policy is re-stamped on the registered
 * one, where `getAutoTranslateConfig` reads it.
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
