import { ValidationError } from "payload";
import type { CollectionBeforeChangeHook, CollectionSlug, Where } from "payload";
import type { AbTestingPluginConfig, CollectionABConfig } from "../types/config";
import { AB_PASS_PERCENTAGE_FIELD, AB_VARIANT_OF_FIELD } from "../constants";
import { resolveId } from "../utils/resolveId";

export function buildParentBeforeChangeHook<TVariantData extends object>(
  parentCollectionSlug: string,
  _abConfig: CollectionABConfig<TVariantData>,
  _pluginConfig: AbTestingPluginConfig<TVariantData>,
): CollectionBeforeChangeHook {
  return async ({ data, originalDoc, req, operation }) => {
    // Only validate when saving a variant doc
    const variantOfValue = data[AB_VARIANT_OF_FIELD] ?? originalDoc?.[AB_VARIANT_OF_FIELD];
    if (!variantOfValue) return data;

    const passPercentage = data[AB_PASS_PERCENTAGE_FIELD];
    if (passPercentage === undefined || passPercentage === null) return data;

    const parentId = resolveId(variantOfValue);
    if (!parentId) return data;

    const conditions: Where[] = [{ [AB_VARIANT_OF_FIELD]: { equals: parentId } }];

    if (operation === "update" && originalDoc?.id) {
      conditions.push({ id: { not_equals: originalDoc.id } });
    }

    const { docs: siblings } = await req.payload.find({
      collection: parentCollectionSlug as CollectionSlug,
      where: { and: conditions },
      depth: 0,
      draft: false,
      overrideAccess: true,
      req,
    });

    const existingSum = siblings.reduce((sum, doc) => {
      const pct = doc[AB_PASS_PERCENTAGE_FIELD];
      return sum + (typeof pct === "number" ? pct : 0);
    }, 0);

    if (existingSum + (passPercentage as number) > 100) {
      const remaining = 100 - existingSum;
      throw new ValidationError({
        errors: [
          {
            path: AB_PASS_PERCENTAGE_FIELD,
            message: `Total variant traffic for this page is ${existingSum}%. This variant cannot exceed ${remaining}% (would exceed 100%).`,
          },
        ],
      });
    }

    return data;
  };
}
