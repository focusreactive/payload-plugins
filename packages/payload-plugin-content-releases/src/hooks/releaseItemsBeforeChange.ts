import type { CollectionBeforeChangeHook } from "payload";
import { RELEASES_SLUG, RELEASE_ITEMS_SLUG } from "../constants";

export function buildReleaseItemsBeforeChange(): CollectionBeforeChangeHook {
  return async ({ data, originalDoc, operation, req }) => {
    const releaseId = data.release as string;
    if (!releaseId) return data;

    const release = await req.payload.findByID({
      collection: RELEASES_SLUG,
      id: releaseId,
    });

    const releaseStatus = (release as any).status;

    // Allow status-only updates while orchestrator is publishing or reverting
    if (
      (releaseStatus === "publishing" || releaseStatus === "reverting") &&
      operation === "update"
    ) {
      const isStatusOnlyUpdate =
        Object.keys(data).every((k) => k === "status" || k === "release") ||
        (data.status && originalDoc);
      if (isStatusOnlyUpdate) {
        return data;
      }
    }

    if (releaseStatus !== "draft" && releaseStatus !== "scheduled") {
      throw new Error(
        `Release items can only be modified when the release is in "draft" or "scheduled" status. Current status: "${releaseStatus}"`,
      );
    }

    if (operation === "create") {
      const existing = await req.payload.find({
        collection: RELEASE_ITEMS_SLUG,
        where: {
          and: [
            { release: { equals: releaseId } },
            { targetCollection: { equals: data.targetCollection } },
            { targetDoc: { equals: data.targetDoc } },
          ],
        },
        limit: 1,
      });

      if (existing.docs.length > 0) {
        throw new Error(
          `Document "${data.targetDoc}" (${data.targetCollection}) already exists in this release. Update the existing item instead.`,
        );
      }
    }

    return data;
  };
}
