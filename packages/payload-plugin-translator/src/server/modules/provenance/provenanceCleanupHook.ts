import type { CollectionAfterDeleteHook, Config, Payload } from "payload";

import type { ProvenanceStore } from "../../../core/provenance";

/**
 * Marks the plugin's own provenance cleanup hook so a repeated `init()` can recognise an
 * already-injected hook and stay idempotent. Same idea as `isProvenanceCollection`, but a hook is a
 * bare function with no `custom` bag, so the marker lives as a property on the function itself
 * (safe because the config is mutated in place — no JSON clone strips it between `init()` runs). The
 * marker holds the provenance *slug*, so two plugin instances with different slugs each attach their
 * own hook (mirrors the per-slug sidecar guard in `plugin.ts`), while a repeated run of the same slug
 * is deduped.
 */
type MarkedHook = CollectionAfterDeleteHook & { __translatorProvenanceCleanup?: string };

/**
 * Build the `afterDelete` hook that cascade-deletes a document's provenance rows for `provenanceSlug`.
 *
 * Best-effort by design: the store's delete runs in its own transaction (the store does not thread
 * `req`), and any failure is swallowed and logged — so cleanup can never roll back or fail the user's
 * document delete. `id` is `number | string`, so it is stringified to match the stored `documentId`.
 */
export function makeProvenanceCleanupHook(
  storeFactory: (payload: Payload) => ProvenanceStore,
  provenanceSlug: string
): CollectionAfterDeleteHook {
  const hook: MarkedHook = async ({ id, collection, req }) => {
    try {
      const store = storeFactory(req.payload);
      await store.deleteByDocument(collection.slug, String(id));
    } catch (error) {
      req.payload.logger.error({
        err: error,
        collection: collection.slug,
        documentId: String(id),
        msg: "translator: failed to clean up provenance records after document delete",
      });
    }
  };
  hook.__translatorProvenanceCleanup = provenanceSlug;
  return hook;
}

/**
 * Attach the provenance cleanup hook to every managed (translatable) collection on `config`, appending
 * to any consumer-supplied `afterDelete` array. Idempotent per `provenanceSlug`: a collection that
 * already carries this slug's cleanup hook is skipped, so a repeated `init()` never stacks duplicates,
 * yet a second instance with a different slug still attaches its own hook. The sidecar collection is
 * never in `managedSlugs`, so it is never hooked (no recursion).
 */
export function injectProvenanceCleanup(
  config: Config,
  managedSlugs: Set<string>,
  storeFactory: (payload: Payload) => ProvenanceStore,
  provenanceSlug: string
): void {
  const hook = makeProvenanceCleanupHook(storeFactory, provenanceSlug);
  for (const collection of config.collections ?? []) {
    if (!managedSlugs.has(collection.slug)) continue;
    collection.hooks ??= {};
    collection.hooks.afterDelete ??= [];
    const alreadyInjected = collection.hooks.afterDelete.some(
      (existing) => (existing as MarkedHook).__translatorProvenanceCleanup === provenanceSlug
    );
    if (!alreadyInjected) collection.hooks.afterDelete.push(hook);
  }
}
