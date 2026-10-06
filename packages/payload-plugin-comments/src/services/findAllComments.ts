import type { Where } from "payload";
import { COMMENT_READS_COLLECTION_SLUG, DEFAULT_COLLECTION_SLUG } from "../constants";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import type { Response, Comment, ServiceContext } from "../types";
import { getCurrentTenantId } from "./getCurrentTenantId";

export interface FindAllCommentsArgs {
  enabledCollections?: string[];
  enabledGlobals?: string[];
  docId?: string | number;
  filterCollectionSlug?: string;
  filterGlobalSlug?: string;
}

export async function findAllComments(
  { payload, user, headers }: ServiceContext,
  {
    enabledCollections,
    enabledGlobals,
    docId,
    filterCollectionSlug,
    filterGlobalSlug,
  }: FindAllCommentsArgs
): Promise<Response<Comment[]>> {
  try {
    const tenantId = getCurrentTenantId(payload, headers);

    const where: Where = {};

    if (docId && filterCollectionSlug) {
      where.and = [
        {
          documentId: { equals: docId },
        },
        {
          collectionSlug: { equals: filterCollectionSlug },
        },
      ];
    } else if (filterGlobalSlug) {
      where.globalSlug = { equals: filterGlobalSlug };
    } else {
      const hasCollections = (enabledCollections?.length ?? 0) > 0;
      const hasGlobals = (enabledGlobals?.length ?? 0) > 0;

      if (hasCollections || hasGlobals) {
        where.or = [
          ...(hasCollections
            ? [
                {
                  collectionSlug: { in: enabledCollections },
                },
              ]
            : []),
          ...(hasGlobals
            ? [
                {
                  globalSlug: { in: enabledGlobals },
                },
              ]
            : []),
        ];
      }
    }

    if (tenantId) {
      where.tenant = { equals: tenantId };
    }

    const { docs: comments } = await payload.find({
      collection: DEFAULT_COLLECTION_SLUG,
      where: Object.keys(where).length ? where : undefined,
      sort: "createdAt",
      limit: 200,
      depth: 1,
      overrideAccess: true,
    });

    let readSet: Set<number> | null = null;

    if (comments.length > 0) {
      const commentIds = comments.map((c) => c.id as number);

      const { docs: reads } = await payload.find({
        collection: COMMENT_READS_COLLECTION_SLUG,
        where: {
          and: [{ user: { equals: user.id } }, { comment: { in: commentIds } }],
        },
        limit: commentIds.length,
        depth: 0,
        overrideAccess: true,
        select: { comment: true },
      });

      readSet = new Set<number>();

      for (const r of reads as Array<{ comment: number | { id: number } }>) {
        const id = typeof r.comment === "object" ? r.comment.id : r.comment;

        if (typeof id === "number") readSet.add(id);
      }
    }

    const enriched = comments.map((c) => ({
      ...c,
      isReadByCurrentUser: readSet ? readSet.has(c.id as number) : false,
    })) as unknown as Comment[];

    return {
      success: true,
      data: enriched,
    };
  } catch (e) {
    console.error("findAllComments failed:", e);
    return {
      success: false,
      error: getDefaultErrorMessage(e),
    };
  }
}
