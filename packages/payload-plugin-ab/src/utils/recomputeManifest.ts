import type { CollectionSlug, TypedLocale } from "payload";
import type { AbTestingPluginConfig, CollectionABConfig } from "../types/config";
import { AB_PASS_PERCENTAGE_FIELD, AB_VARIANT_OF_FIELD, DEFAULT_SLUG_FIELD } from "../constants";
import { getLocales } from "./getLocales";

export async function recomputeManifestForParent<TVariantData extends object>(
  parentId: string | number,
  parentCollectionSlug: string,
  abConfig: CollectionABConfig<TVariantData>,
  pluginConfig: AbTestingPluginConfig<TVariantData>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: any,
  options?: { excludeId?: string | number },
): Promise<void> {
  const { payload } = req;
  const locales = getLocales(payload);
  const slugField = abConfig.slugField ?? DEFAULT_SLUG_FIELD;

  for (const locale of locales) {
    const parentDoc = await payload.findByID({
      collection: parentCollectionSlug as CollectionSlug,
      id: parentId,
      depth: 0,
      locale: locale as TypedLocale,
      overrideAccess: true,
      req,
    });
    if (!parentDoc) continue;

    const manifestKey = abConfig.generatePath({ doc: parentDoc, locale });
    if (!manifestKey) continue;

    const whereClause =
      options?.excludeId !== undefined
        ? {
            and: [
              { [AB_VARIANT_OF_FIELD]: { equals: parentId } },
              { id: { not_equals: options.excludeId } },
            ],
          }
        : { [AB_VARIANT_OF_FIELD]: { equals: parentId } };

    const { docs: variantDocs } = await payload.find({
      collection: parentCollectionSlug as CollectionSlug,
      where: whereClause,
      depth: 0,
      locale: locale as TypedLocale,
      overrideAccess: true,
      limit: 100,
      req,
    });

    if (variantDocs.length === 0) {
      await pluginConfig.storage.clear(manifestKey, payload);
      continue;
    }

    const variantData = variantDocs.map((variantDoc: Record<string, unknown>) => {
      if (abConfig.generateVariantData) {
        return abConfig.generateVariantData({ doc: parentDoc, variantDoc, locale });
      }
      // Default: derive bucket from slug, rewritePath from generatePath on variant doc
      const variantPath = abConfig.generatePath({ doc: variantDoc, locale });
      return {
        bucket: (variantDoc[slugField] as string) ?? String(variantDoc.id),
        rewritePath: variantPath ?? "",
        passPercentage: (variantDoc[AB_PASS_PERCENTAGE_FIELD] as number) ?? 0,
      } as unknown as TVariantData;
    });

    await pluginConfig.storage.write(manifestKey, variantData, payload);
  }
}
