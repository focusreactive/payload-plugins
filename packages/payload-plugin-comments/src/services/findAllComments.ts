"use server";

import type { TypedUser, Where } from "payload";
import { extractPayload } from "../utils/payload/extractPayload";
import { DEFAULT_COLLECTION_SLUG } from "../constants";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import type { Response, Comment, BaseServiceOptions } from "../types";
import { getCurrentTenantId } from "./getCurrentTenantId";

interface Props {
  enabledCollections?: string[];
  user?: TypedUser | null;
  options?: BaseServiceOptions;
}

export async function findAllComments({ enabledCollections, options }: Props = {}): Promise<Response<Comment[]>> {
  try {
    const payload = await extractPayload(options?.payload);

    const tenantId = await getCurrentTenantId(payload);

    const where: Where = {};

    if (enabledCollections?.length) {
      where.collectionSlug = { in: enabledCollections };
    }

    if (tenantId) {
      where.tenant = {
        equals: tenantId,
      };
    }

    const { docs: comments } = await payload.find({
      collection: DEFAULT_COLLECTION_SLUG,
      where: Object.keys(where).length ? where : undefined,
      sort: "createdAt",
      limit: 200,
      depth: 1,
      overrideAccess: true,
    });

    return {
      success: true,
      data: comments as unknown as Comment[],
    };
  } catch (e) {
    console.error("findAllComments failed:", e);

    return {
      success: false,
      error: getDefaultErrorMessage(e),
    };
  }
}
