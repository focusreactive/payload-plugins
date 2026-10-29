import type { CollectionAfterDeleteHook, CollectionSlug } from "payload";

import type { ManagedCollectionsConfig } from "./RunRecord.shapes.js";
import type { RunRecordStoreFactory } from "./RunRecord.store.js";

/**
 * Payload's hook is a bare function with no `custom` bag, so the idempotency marker rides on the
 * function itself; it holds the runs slug, so two plugin instances each attach their own.
 */
type MarkedHook = CollectionAfterDeleteHook & { __translatorRunRecordCleanup?: string };

/**
 * Best-effort: the store is opened with no scope, so the delete runs outside the caller's
 * transaction and a failure is logged rather than thrown — cleanup must never roll back the delete.
 */
export function makeRunRecordCleanupHook(
  storeFactory: RunRecordStoreFactory,
  runsSlug: string
): CollectionAfterDeleteHook {
  const hook: MarkedHook = async ({ id, collection, req }) => {
    try {
      const store = storeFactory(req.payload);
      await store.deleteByDocument({
        collectionSlug: collection.slug as CollectionSlug,
        collectionId: String(id),
      });
    } catch (error) {
      req.payload.logger.error({
        err: error,
        collection: collection.slug,
        documentId: String(id),
        msg: "translator: failed to clean up run records after document delete",
      });
    }
  };
  hook.__translatorRunRecordCleanup = runsSlug;
  return hook;
}

export function injectRunRecordCleanup(
  config: ManagedCollectionsConfig,
  managedSlugs: Set<string>,
  storeFactory: RunRecordStoreFactory,
  runsSlug: string
): void {
  const hook = makeRunRecordCleanupHook(storeFactory, runsSlug);
  for (const collection of config.collections ?? []) {
    if (!managedSlugs.has(collection.slug)) continue;
    collection.hooks ??= {};
    collection.hooks.afterDelete ??= [];
    const alreadyInjected = collection.hooks.afterDelete.some(
      (existing) => (existing as MarkedHook).__translatorRunRecordCleanup === runsSlug
    );
    if (!alreadyInjected) collection.hooks.afterDelete.push(hook);
  }
}
