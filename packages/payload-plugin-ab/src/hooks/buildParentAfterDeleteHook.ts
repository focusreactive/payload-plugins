import type { CollectionAfterDeleteHook } from "payload";

import { AB_VARIANT_OF_FIELD } from "../constants";
import type {
  AbTestingPluginConfig,
  CollectionABConfig,
} from "../types/config";
import { recomputeManifestForParent } from "../utils/recomputeManifest";
import { resolveId } from "../utils/resolveId";

export function buildParentAfterDeleteHook<TVariantData extends object>(
  parentCollectionSlug: string,
  abConfig: CollectionABConfig<TVariantData>,
  pluginConfig: AbTestingPluginConfig<TVariantData>
): CollectionAfterDeleteHook {
  return async ({ doc, req, id }) => {
    const { payload } = req;
    if (!payload) {return;}

    const variantOfValue = doc[AB_VARIANT_OF_FIELD];

    // Only act when a variant doc is deleted
    if (!variantOfValue) {return;}

    const parentId = resolveId(variantOfValue);
    if (!parentId) {return;}

    await recomputeManifestForParent(
      parentId,
      parentCollectionSlug,
      abConfig,
      pluginConfig,
      req,
      {
        excludeId: id,
      }
    );
  };
}
