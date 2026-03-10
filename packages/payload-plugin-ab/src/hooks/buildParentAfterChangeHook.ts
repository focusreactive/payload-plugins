import type { CollectionAfterChangeHook } from "payload";
import type { AbTestingPluginConfig, CollectionABConfig } from "../types/config";
import { AB_VARIANT_OF_FIELD } from "../constants";
import { resolveId } from "../utils/resolveId";
import { recomputeManifestForParent } from "../utils/recomputeManifest";

export function buildParentAfterChangeHook<TVariantData extends object>(
  parentCollectionSlug: string,
  abConfig: CollectionABConfig<TVariantData>,
  pluginConfig: AbTestingPluginConfig<TVariantData>,
): CollectionAfterChangeHook {
  return async ({ doc, req }) => {
    const { payload } = req;
    if (!payload) return;

    const variantOfValue = doc[AB_VARIANT_OF_FIELD];

    if (variantOfValue) {
      // This doc is a variant — recompute manifest for its parent
      const parentId = resolveId(variantOfValue);
      if (!parentId) return;
      await recomputeManifestForParent(parentId, parentCollectionSlug, abConfig, pluginConfig, req);
    } else {
      // This doc is an original — recompute manifest using its own variants
      await recomputeManifestForParent(doc.id, parentCollectionSlug, abConfig, pluginConfig, req);
    }
  };
}
