"use server";

import { headers } from "next/headers";

import { DEFAULT_COLLECTION_SLUG } from "../constants";
import type { BaseServiceOptions, Response, Comment } from "../types";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import { extractPayload } from "../utils/payload/extractPayload";

export async function deleteComment(
  id: number | string,
  options?: BaseServiceOptions
): Promise<Response<Comment>> {
  try {
    const payload = await extractPayload(options?.payload);
    const { user } = await payload.auth({ headers: await headers() });

    if (!user) {
      return { error: "Unauthorized", success: false };
    }

    const data = (await payload.delete({
      collection: DEFAULT_COLLECTION_SLUG,
      id,
      overrideAccess: false,
      user,
    })) as Comment;

    return {
      data,
      success: true,
    };
  } catch (error) {
    console.error(`Failed to delete ${id} comment`, error);

    return {
      success: false,
      error: getDefaultErrorMessage(error),
    };
  }
}
