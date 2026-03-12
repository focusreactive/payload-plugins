"use server";

import { headers } from "next/headers";
import { DEFAULT_COLLECTION_SLUG } from "../constants";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import type { BaseServiceOptions, Response, Comment } from "../types";
import { extractPayload } from "../utils/payload/extractPayload";

export async function deleteComment(id: number | string, options?: BaseServiceOptions): Promise<Response<Comment>> {
  try {
    const payload = await extractPayload(options?.payload);
    const { user } = await payload.auth({ headers: await headers() });

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const data = (await payload.delete({
      collection: DEFAULT_COLLECTION_SLUG,
      id,
      overrideAccess: false,
      user,
    })) as Comment;

    return {
      success: true,
      data,
    };
  } catch (e) {
    console.error(`Failed to delete ${id} comment`, e);

    return {
      success: false,
      error: getDefaultErrorMessage(e),
    };
  }
}
