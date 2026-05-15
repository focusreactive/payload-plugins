import type { CollectionAfterChangeHook, CollectionSlug } from "payload";

import {
  AB_PASS_PERCENTAGE_FIELD,
  AB_VARIANT_OF_FIELD,
  AB_VARIANT_PERCENTAGES_FIELD,
} from "../constants";
import type {
  AbTestingPluginConfig,
  CollectionABConfig,
} from "../types/config";
import { recomputeManifestForParent } from "../utils/recomputeManifest";
import { resolveId } from "../utils/resolveId";

export function buildParentAfterChangeHook<TVariantData extends object>(
  parentCollectionSlug: string,
  abConfig: CollectionABConfig<TVariantData>,
  pluginConfig: AbTestingPluginConfig<TVariantData>
): CollectionAfterChangeHook {
  return async ({ doc, req }) => {
    const { payload } = req;
    if (!payload) {return;}

    const variantOfValue = doc[AB_VARIANT_OF_FIELD];
    const isDraft = doc._status === "draft";

    if (variantOfValue) {
      // This doc is a variant — recompute manifest for its parent
      if (isDraft) {return;}
      const parentId = resolveId(variantOfValue);
      if (!parentId) {return;}
      await recomputeManifestForParent(
        parentId,
        parentCollectionSlug,
        abConfig,
        pluginConfig,
        req
      );
    } else {
      // This doc is an original — apply pending % changes to variant docs, then recompute.
      const pending = doc[AB_VARIANT_PERCENTAGES_FIELD] as
        | Record<string, number>
        | undefined
        | null;

      if (
        pending &&
        typeof pending === "object" &&
        Object.keys(pending).length > 0
      ) {
        await Promise.all(
          Object.entries(pending).map(([variantId, percentage]) => {
            if (typeof percentage !== "number") {return Promise.resolve();}
            return payload
              .update({
                collection: parentCollectionSlug as CollectionSlug,
                id: variantId,
                data: { [AB_PASS_PERCENTAGE_FIELD]: percentage },
                ...(isDraft ? { draft: true } : {}),
                overrideAccess: true,
                req,
              })
              .catch(() => {
                // non-fatal: variant may have been deleted between edit and save
              });
          })
        );
      }

      if (!isDraft) {
        await recomputeManifestForParent(
          doc.id,
          parentCollectionSlug,
          abConfig,
          pluginConfig,
          req
        );
      }
    }
  };
}
