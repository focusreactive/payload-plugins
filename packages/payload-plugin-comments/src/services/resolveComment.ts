"use server";

import { headers } from "next/headers";

import { DEFAULT_COLLECTION_SLUG } from "../constants";
import type { Response, Comment, BaseServiceOptions } from "../types";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import { extractPayload } from "../utils/payload/extractPayload";

export async function resolveComment(
  id: number | string,
  resolved: boolean,
  options?: BaseServiceOptions
): Promise<Response<Comment>> {
  try {
    const payload = await extractPayload(options?.payload);
    const { user } = await payload.auth({ headers: await headers() });

    if (!user) {
      return {
        error: "Unauthorized",
        success: false,
      };
    }

    const res = await payload.update({
      collection: DEFAULT_COLLECTION_SLUG,
      data: {
        isResolved: resolved,
        resolvedAt: resolved ? new Date().toISOString() : null,
        resolvedBy: resolved ? user.id : null,
      },
      id,
      overrideAccess: false,
      user,
    });

    return {
      data: res as unknown as Comment,
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: getDefaultErrorMessage(error),
    };
  }
}
