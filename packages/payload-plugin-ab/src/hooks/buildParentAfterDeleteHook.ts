import type { CollectionAfterDeleteHook, CollectionSlug } from "payload";
import type { AbTestingPluginConfig, CollectionABConfig } from "../types/config";
import { AB_EXPERIMENTS_SLUG, AB_VARIANT_OF_FIELD } from "../constants";
import { resolveId } from "../utils/resolveId";
import { getLocales } from "../utils/getLocales";
import { recomputeManifestForParent } from "../utils/recomputeManifest";

export function buildParentAfterDeleteHook<TVariantData extends object>(
  parentCollectionSlug: string,
  abConfig: CollectionABConfig<TVariantData>,
  pluginConfig: AbTestingPluginConfig<TVariantData>
): CollectionAfterDeleteHook {
  return async ({ doc, req, id }) => {
    const { payload } = req;
    if (!payload) return;

    const variantOfValue = doc[AB_VARIANT_OF_FIELD];

    if (variantOfValue) {
      const parentId = resolveId(variantOfValue);
      if (!parentId) return;

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
      return;
    }

    const locales = getLocales(payload);
    for (const locale of locales) {
      const manifestKey = abConfig.generatePath({ doc, locale });
      if (!manifestKey) continue;
      await pluginConfig.storage.clear(manifestKey, payload);
    }

    const { docs: variantDocs } = await payload.find({
      collection: parentCollectionSlug as CollectionSlug,
      where: { [AB_VARIANT_OF_FIELD]: { equals: id } },
      depth: 0,
      overrideAccess: true,
      limit: 100,
      req,
    });

    await Promise.all(
      variantDocs.map((variantDoc: Record<string, unknown>) =>
        payload
          .update({
            collection: parentCollectionSlug as CollectionSlug,
            id: variantDoc.id as string | number,
            data: { [AB_VARIANT_OF_FIELD]: null },
            overrideAccess: true,
            req,
          })
          .catch(() => {
            // non-fatal: variant may have been removed concurrently
          })
      )
    );

    const experimentsSlug = pluginConfig.experimentsCollectionSlug ?? AB_EXPERIMENTS_SLUG;
    await payload
      .delete({
        collection: experimentsSlug as CollectionSlug,
        where: { parentDocId: { equals: String(id) } },
        overrideAccess: true,
        req,
      })
      .catch(() => {
        // non-fatal: nothing to delete if no experiment was ever recorded
      });
  };
}
