"use server";

import { headers } from "next/headers";
import type { TypedUser, Where } from "payload";
import { extractPayload } from "../utils/payload/extractPayload";
import { COMMENT_READS_COLLECTION_SLUG, DEFAULT_COLLECTION_SLUG } from "../constants";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import type { Response, Comment, BaseServiceOptions } from "../types";
import { getCurrentTenantId } from "./getCurrentTenantId";

interface Props {
  enabledCollections?: string[];
  enabledGlobals?: string[];
  user?: TypedUser | null;
  options?: BaseServiceOptions;
  docId?: string | number;
  filterCollectionSlug?: string;
  filterGlobalSlug?: string;
}

export async function findAllComments({
  enabledCollections,
  enabledGlobals,
  options,
  docId,
  filterCollectionSlug,
  filterGlobalSlug,
}: Props = {}): Promise<Response<Comment[]>> {
  try {
    const payload = await extractPayload(options?.payload);
    const tenantId = await getCurrentTenantId(payload);

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
          ...(hasCollections ?
            [
              {
                collectionSlug: { in: enabledCollections },
              },
            ]
          : []),
          ...(hasGlobals ?
            [
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

    const { user } = await payload.auth({ headers: await headers() });

    let readSet: Set<number> | null = null;

    if (user && comments.length > 0) {
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
