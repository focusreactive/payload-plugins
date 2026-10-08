import { DEFAULT_COLLECTION_SLUG } from "../constants";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import type { Response, Comment, ServiceContext } from "../types";

export interface DeleteCommentArgs {
  id: number | string;
}

export async function deleteComment(
  { payload, user }: ServiceContext,
  { id }: DeleteCommentArgs
): Promise<Response<Comment>> {
  try {
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
