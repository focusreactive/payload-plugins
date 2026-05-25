"use server";

import type { TypedUser, Where } from "payload";

import { DEFAULT_COLLECTION_SLUG } from "../constants";
import type { Response, Comment, BaseServiceOptions } from "../types";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import { extractPayload } from "../utils/payload/extractPayload";
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
      depth: 1,
      limit: 200,
      overrideAccess: true,
      sort: "createdAt",
      where: Object.keys(where).length ? where : undefined,
    });

    return {
      data: comments as unknown as Comment[],
      success: true,
    };
  } catch (error) {
    console.error("findAllComments failed:", error);
    return {
      success: false,
      error: getDefaultErrorMessage(error),
    };
  }
}
