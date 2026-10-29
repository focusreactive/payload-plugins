import type { CollectionAfterChangeHook, CollectionSlug } from "payload";
import { hasDraftsEnabled } from "payload/shared";

import { authCollectionsOf, identityOf, scopeOf } from "../../shared/payload/identityOf.js";
import { authorisedByTheSave } from "../../shared/access/authorised.js";
import { swallowOrThrow } from "../../shared/payload/swallowOrThrow.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";

import { hasSourceContentChanged } from "../../../core/domain/auto-translate/index.js";
import { AUTO_TRANSLATE_CUSTOM_KEY } from "../../../core/domain/auto-translate/index.js";
import { AUTO_TRANSLATE_SKIP_CONTEXT_KEY } from "../../../types/AutoTranslateContext.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { TaskRunnerFactory } from "../task-runner/index.js";
import type { RunRecordStoreFactory } from "../runs/index.js";
import { admitWork } from "../../../core/domain/runs/index.js";

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
  runRecordStoreFactory: RunRecordStoreFactory;
};

/** `afterChange` hook that enqueues translations when a document's source-locale content changes. */
export function makeAutoTranslateHook(deps: AutoTranslateHookDeps): CollectionAfterChangeHook {
  const { resolvePolicy, schemaMap, taskRunnerFactory, runRecordStoreFactory } = deps;

  const hook: MarkedHook = async ({ doc, previousDoc, req, collection }) => {
    const transactionID = await req.transactionID;
    const scope: RequestScope = transactionID == null ? {} : { transactionID };
    const about = { collection: collection.slug, documentId: String(doc.id) };
    const skipBecause = (msg: string) => {
      req.payload.logger.warn({ ...about, msg });
    };

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
          return skipBecause(
            "translator: auto-translate skipped — no source locale resolvable (set localization.defaultLocale or a per-collection sourceLocale)"
          );
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

        const identity = identityOf(req, authCollectionsOf(req.payload), req.payload.logger);
        if (identity.kind === "unnameable") {
          return skipBecause(
            "translator: auto-translate skipped, because the save carries an actor this project cannot name"
          );
        }

        const { admitted, busyDocumentIds: busy } = admitWork({
          work: authorisedByTheSave(tasks),
          inFlight: await runRecordStoreFactory(req.payload, scope).findLiveForDocuments(
            collection.slug as CollectionSlug,
            [String(doc.id)]
          ),
        });
        if (busy.length > 0) {
          return skipBecause(
            "translator: auto-translate skipped, because this document already has a translation run under way"
          );
        }

        await taskRunnerFactory.create(req.payload).enqueue(admitted, {
          ...scope,
          ...scopeOf(identity),
        });
      },
      (error) =>
        req.payload.logger.error({
          ...about,
          err: error,
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
