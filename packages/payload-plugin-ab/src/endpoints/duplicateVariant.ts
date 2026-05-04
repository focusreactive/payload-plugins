import type { CollectionSlug, PayloadHandler } from "payload";
import { AB_PASS_PERCENTAGE_FIELD, AB_VARIANT_OF_FIELD, DEFAULT_SLUG_FIELD } from "../constants";

// 6-char alphanumeric hash — no external dep needed
function nanoid(): string {
  return Math.random().toString(36).slice(2, 8);
}

export const duplicateVariantHandler: PayloadHandler = async (req) => {
  if (!req.payload) {
    return Response.json({ error: "Payload not available" }, { status: 500 });
  }

  let body: { collectionSlug?: string; docId?: string; slugField?: string };
  try {
    if (!req.json) {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { collectionSlug, docId, slugField = DEFAULT_SLUG_FIELD } = body;

  if (!collectionSlug || !docId) {
    return Response.json({ error: "collectionSlug and docId are required" }, { status: 400 });
  }

  let parentDoc: Record<string, unknown>;
  try {
    parentDoc = (await req.payload.findByID({
      collection: collectionSlug as CollectionSlug,
      id: docId,
      depth: 0,
      overrideAccess: false,
      req,
    })) as Record<string, unknown>;

    if (!parentDoc) {
      return Response.json({ error: "Parent document not found" }, { status: 404 });
    }
  } catch {
    return Response.json({ error: "Parent document not found" }, { status: 404 });
  }

  const originalSlug = (parentDoc[slugField] as string) ?? docId;

  let existingVariants: Array<Record<string, unknown>>;
  try {
    const result = await req.payload.find({
      collection: collectionSlug as CollectionSlug,
      where: { [AB_VARIANT_OF_FIELD]: { equals: docId } },
      depth: 0,
      limit: 100,
      overrideAccess: true,
      req,
    });
    existingVariants = result.docs as Array<Record<string, unknown>>;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read existing variants";
    return Response.json({ error: message }, { status: 500 });
  }

  const totalSlots = existingVariants.length + 2;
  const perSlot = Math.max(1, Math.floor(100 / totalSlots));

  const transactionID = (await req.payload.db.beginTransaction?.()) ?? undefined;
  if (transactionID) {
    req.transactionID = transactionID;
  }

  try {
    for (const variant of existingVariants) {
      await req.payload.update({
        collection: collectionSlug as CollectionSlug,
        id: variant.id as string,
        data: { [AB_PASS_PERCENTAGE_FIELD]: perSlot },
        overrideAccess: true,
        req,
      });
    }

    const newDoc = (await req.payload.duplicate({
      collection: collectionSlug as CollectionSlug,
      id: docId,
      data: {
        [slugField]: `${originalSlug}--${nanoid()}`,
        [AB_VARIANT_OF_FIELD]: docId,
        [AB_PASS_PERCENTAGE_FIELD]: perSlot,
      },
      overrideAccess: true,
      req,
    })) as Record<string, unknown>;

    if (transactionID) {
      await req.payload.db.commitTransaction?.(transactionID);
    }

    return Response.json({ id: newDoc.id, slug: newDoc[slugField], passPercentage: perSlot }, { status: 201 });
  } catch (err) {
    if (transactionID) {
      await req.payload.db.rollbackTransaction?.(transactionID);
    }
    const message = err instanceof Error ? err.message : "Failed to create variant";
    return Response.json({ error: message }, { status: 500 });
  }
};
