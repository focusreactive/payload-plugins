import type { CollectionAfterChangeHook } from "payload";
import type { AbTestingPluginConfig, CollectionABConfig } from "../types/config";
import { AB_CASCADE_CONTEXT_KEY, AB_PENDING_CONTEXT_KEY, AB_VARIANT_OF_FIELD } from "../constants";
import { applyVariantPercentage } from "../utils/applyVariantPercentage";
import type { VariantPercentageEntry } from "../utils/buildPercentagePlan";
import { recomputeManifestForParent } from "../utils/recomputeManifest";
import { resolveId } from "../utils/resolveId";
import { ensureExperimentRecords } from "./ensureExperimentRecords";

export function buildParentAfterChangeHook<TVariantData extends object>(
  parentCollectionSlug: string,
  abConfig: CollectionABConfig<TVariantData>,
  pluginConfig: AbTestingPluginConfig<TVariantData>
): CollectionAfterChangeHook {
  return async ({ doc, req }) => {
    const { payload, context } = req;
    if (!payload) return;
    if (context?.[AB_CASCADE_CONTEXT_KEY]) return;

    const isDraft = doc._status === "draft";
    const variantOfValue = doc[AB_VARIANT_OF_FIELD];

    if (variantOfValue) {
      if (isDraft) return;
      const parentId = resolveId(variantOfValue);
      if (!parentId) return;
      await recomputeManifestForParent(parentId, parentCollectionSlug, abConfig, pluginConfig, req);
      await ensureExperimentRecords(parentId, parentCollectionSlug, abConfig, pluginConfig, req);
      return;
    }

    const entries = context?.[AB_PENDING_CONTEXT_KEY] as VariantPercentageEntry[] | undefined;
    if (context) delete context[AB_PENDING_CONTEXT_KEY];

    if (entries && entries.length > 0) {
      context[AB_CASCADE_CONTEXT_KEY] = true;

      try {
        for (const entry of entries) {
          await applyVariantPercentage({
            collectionSlug: parentCollectionSlug,
            entry,
            isPublish: !isDraft,
            req,
          });
        }
      } finally {
        delete context[AB_CASCADE_CONTEXT_KEY];
      }
    }

    if (isDraft) return;

    await recomputeManifestForParent(doc.id, parentCollectionSlug, abConfig, pluginConfig, req);
    await ensureExperimentRecords(doc.id, parentCollectionSlug, abConfig, pluginConfig, req);
  };
}
