import type { Access, CollectionBeforeChangeHook, CollectionSlug } from "payload";

import { isAuthor, REVIEW_STATUS } from "./status";

const REVERT_CONTEXT_KEY = "reviewRevertToPublished";

/**
 * The author's update rule: drafts always; publishing only once the saved review status is Approved.
 * The one other publish it allows is the admin's "Revert to published", which PATCHes the published
 * document back unchanged; `restorePublishedOnRevert` then writes the published content itself, so
 * a request posing as a revert cannot publish anything new. Permission checks (not PATCH) never
 * take that branch, so Publish stays hidden until approval.
 */
export const authorUpdate =
  (collection: CollectionSlug): Access =>
  async ({ data, id, req }) => {
    if (!isAuthor(req.user)) {
      return false;
    }

    if ((data as { _status?: string } | undefined)?._status !== "published") {
      return true;
    }

    if (id === undefined || id === null) {
      return false;
    }

    const latest = (await req.payload.findByID({
      collection,
      depth: 0,
      draft: true,
      id,
      overrideAccess: true,
      req,
    })) as { reviewStatus?: string | null };

    if (latest.reviewStatus === REVIEW_STATUS.approved) {
      return true;
    }

    if (req.method !== "PATCH") {
      return false;
    }

    const published = (await req.payload.findByID({
      collection,
      depth: 0,
      id,
      overrideAccess: true,
      req,
    })) as { _status?: string | null; updatedAt?: string };
    const sentUpdatedAt = (data as { updatedAt?: unknown }).updatedAt;

    if (published._status !== "published" || sentUpdatedAt !== published.updatedAt) {
      return false;
    }

    req.context[REVERT_CONTEXT_KEY] = true;

    return true;
  };

export const restorePublishedOnRevert: CollectionBeforeChangeHook = async ({
  collection,
  data,
  originalDoc,
  req,
}) => {
  if (req.context[REVERT_CONTEXT_KEY] !== true || !originalDoc?.id) {
    return data;
  }

  const published = await req.payload.findByID({
    collection: collection.slug as CollectionSlug,
    depth: 0,
    fallbackLocale: false,
    id: originalDoc.id,
    locale: req.locale ?? undefined,
    overrideAccess: true,
    req,
  });

  return { ...published, _status: "published" };
};
