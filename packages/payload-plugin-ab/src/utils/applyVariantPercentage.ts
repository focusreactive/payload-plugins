import type { CollectionSlug, PayloadRequest } from "payload";
import { AB_PASS_PERCENTAGE_FIELD } from "../constants";
import type { VariantPercentageEntry } from "./buildPercentagePlan";

export async function applyVariantPercentage({
  collectionSlug,
  entry,
  isPublish,
  req,
}: {
  collectionSlug: string;
  entry: VariantPercentageEntry;
  isPublish: boolean;
  req: PayloadRequest;
}): Promise<void> {
  const { payload } = req;
  const { desired, draftPercentage, isDirty, publishedPercentage, variantId } = entry;
  const collection = collectionSlug as CollectionSlug;

  const shouldPublish =
    isPublish && publishedPercentage !== null && publishedPercentage !== desired;

  if (shouldPublish && !isDirty) {
    await payload.update({
      collection,
      id: variantId,
      data: {
        [AB_PASS_PERCENTAGE_FIELD]: desired,
      },
      overrideAccess: true,
      req,
    });

    return;
  }

  if (desired !== draftPercentage) {
    await payload.update({
      collection,
      id: variantId,
      data: {
        [AB_PASS_PERCENTAGE_FIELD]: desired,
      },
      draft: true,
      overrideAccess: true,
      req,
    });
  }

  if (!shouldPublish) return;

  const raw = await payload.db.findOne({
    collection: collectionSlug,
    where: {
      id: { equals: variantId },
    },
    req,
  });
  if (!raw) return;

  await payload.db.updateOne({
    collection: collectionSlug,
    id: variantId,
    data: {
      ...raw,
      [AB_PASS_PERCENTAGE_FIELD]: desired,
    },
    req,
  });
}
