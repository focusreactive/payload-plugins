"use server";

import type { Response, Comment, BaseServiceOptions } from "../types";
import { headers } from "next/headers";
import { DEFAULT_COLLECTION_SLUG } from "../constants";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import { extractPayload } from "../utils/payload/extractPayload";

export async function resolveComment(
  id: number | string,
  resolved: boolean,
  options?: BaseServiceOptions,
): Promise<Response<Comment>> {
  try {
    const payload = await extractPayload(options?.payload);
    const { user } = await payload.auth({ headers: await headers() });

    if (!user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const res = await payload.update({
      collection: DEFAULT_COLLECTION_SLUG,
      id,
      data: {
        isResolved: resolved,
        resolvedBy: resolved ? user.id : null,
        resolvedAt: resolved ? new Date().toISOString() : null,
      },
      overrideAccess: false,
      user,
    });

    return {
      success: true,
      data: res as unknown as Comment,
    };
  } catch (err) {
    return {
      success: false,
      error: getDefaultErrorMessage(err),
    };
  }
}
