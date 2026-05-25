import type { CollectionSlug, PayloadHandler } from "payload";

import {
  AB_PASS_PERCENTAGE_FIELD,
  AB_VARIANT_OF_FIELD,
  DEFAULT_SLUG_FIELD,
} from "../constants";

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
    return Response.json(
      { error: "collectionSlug and docId are required" },
      { status: 400 }
    );
  }

  let parentDoc: Record<string, unknown>;
  try {
    parentDoc = (await req.payload.findByID({
      collection: collectionSlug as CollectionSlug,
      depth: 0,
      id: docId,
      overrideAccess: false,
      req,
    })) as Record<string, unknown>;

    if (!parentDoc) {
      return Response.json(
        { error: "Parent document not found" },
        { status: 404 }
      );
    }
  } catch {
    return Response.json(
      { error: "Parent document not found" },
      { status: 404 }
    );
  }

  const originalSlug = (parentDoc[slugField] as string) ?? docId;

  try {
    const newDoc = (await req.payload.duplicate({
      collection: collectionSlug as CollectionSlug,
      data: {
        [slugField]: `${originalSlug}--${nanoid()}`,
        [AB_VARIANT_OF_FIELD]: docId,
        [AB_PASS_PERCENTAGE_FIELD]: 1,
      },
      id: docId,
      overrideAccess: true,
      req,
    })) as Record<string, unknown>;

    return Response.json(
      { id: newDoc.id, passPercentage: 1, slug: newDoc[slugField] },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create variant";
    return Response.json({ error: message }, { status: 500 });
  }
};
