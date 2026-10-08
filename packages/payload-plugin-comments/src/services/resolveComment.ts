import type { Response, Comment, ServiceContext } from "../types";
import { DEFAULT_COLLECTION_SLUG } from "../constants";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";

export interface ResolveCommentArgs {
  id: number | string;
  resolved: boolean;
}

export async function resolveComment(
  { payload, user }: ServiceContext,
  { id, resolved }: ResolveCommentArgs
): Promise<Response<Comment>> {
  try {
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
