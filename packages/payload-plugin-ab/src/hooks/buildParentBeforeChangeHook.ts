import { ValidationError } from "payload";
import type { CollectionBeforeChangeHook, CollectionSlug, Where } from "payload";
import type { AbTestingPluginConfig, CollectionABConfig } from "../types/config";
import {
  AB_CASCADE_CONTEXT_KEY,
  AB_MAX_VARIANT_TOTAL,
  AB_PASS_PERCENTAGE_FIELD,
  AB_PENDING_CONTEXT_KEY,
  AB_PENDING_PERCENTAGES_FIELD,
  AB_VARIANT_OF_FIELD,
} from "../constants";
import { buildPercentagePlan } from "../utils/buildPercentagePlan";
import { resolveId } from "../utils/resolveId";

export function buildParentBeforeChangeHook<TVariantData extends object>(
  parentCollectionSlug: string,
  _abConfig: CollectionABConfig<TVariantData>,
  _pluginConfig: AbTestingPluginConfig<TVariantData>
): CollectionBeforeChangeHook {
  const collection = parentCollectionSlug as CollectionSlug;

  return async ({ data, originalDoc, req, operation }) => {
    if (req.context?.[AB_CASCADE_CONTEXT_KEY]) return data;

    const variantOfValue = data[AB_VARIANT_OF_FIELD] ?? originalDoc?.[AB_VARIANT_OF_FIELD];

    if (variantOfValue) {
      const passPercentage = data[AB_PASS_PERCENTAGE_FIELD];
      if (typeof passPercentage !== "number") return data;

      const parentId = resolveId(variantOfValue);
      if (!parentId) return data;

      const conditions: Where[] = [{ [AB_VARIANT_OF_FIELD]: { equals: parentId } }];
      if (operation === "update" && originalDoc?.id) {
        conditions.push({ id: { not_equals: originalDoc.id } });
      }

      const { docs: siblings } = await req.payload.find({
        collection,
        where: { and: conditions },
        depth: 0,
        draft: true,
        limit: 100,
        overrideAccess: true,
        req,
      });

      const existingSum = siblings.reduce((sum, doc) => {
        const pct = doc[AB_PASS_PERCENTAGE_FIELD];
        return sum + (typeof pct === "number" ? pct : 0);
      }, 0);

      if (existingSum + passPercentage > AB_MAX_VARIANT_TOTAL) {
        throw new ValidationError({
          errors: [
            {
              path: AB_PASS_PERCENTAGE_FIELD,
              message: `Other variants already take ${existingSum}% of this page's traffic. This variant cannot exceed ${AB_MAX_VARIANT_TOTAL - existingSum}%.`,
            },
          ],
        });
      }

      return data;
    }

    const parentId = originalDoc?.id ?? data.id;
    if (!parentId) return data;

    const pending = data[AB_PENDING_PERCENTAGES_FIELD];
    const hasPending =
      typeof pending === "object" && pending !== null && Object.keys(pending).length > 0;
    const isPublish = data._status !== "draft";
    if (!hasPending && !isPublish) return data;

    const where: Where = { [AB_VARIANT_OF_FIELD]: { equals: parentId } };
    const findArgs = { collection, where, depth: 0, limit: 100, overrideAccess: true, req };

    const draftResult = await req.payload.find({ ...findArgs, draft: true });
    if (draftResult.docs.length === 0) return data;
    const publishedResult = await req.payload.find({ ...findArgs, draft: false });

    const plan = buildPercentagePlan({
      pending: hasPending ? (pending as Record<string, unknown>) : {},
      draftDocs: draftResult.docs,
      publishedDocs: publishedResult.docs,
    });

    if (plan.total > AB_MAX_VARIANT_TOTAL) {
      throw new ValidationError({
        errors: [
          {
            path: AB_PENDING_PERCENTAGES_FIELD,
            message: `Total variant traffic is ${plan.total}%. It cannot exceed ${AB_MAX_VARIANT_TOTAL}% — the original page must keep at least ${100 - AB_MAX_VARIANT_TOTAL}%.`,
          },
        ],
      });
    }

    if (plan.entries.length > 0) {
      req.context[AB_PENDING_CONTEXT_KEY] = plan.entries;
    }

    return data;
  };
}
