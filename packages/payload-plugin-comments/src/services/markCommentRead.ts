"use server";

import { headers } from "next/headers";
import { COMMENT_READS_COLLECTION_SLUG, DEFAULT_COLLECTION_SLUG } from "../constants";
import { extractPayload } from "../utils/payload/extractPayload";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import { getCurrentTenantId } from "./getCurrentTenantId";
import type { BaseServiceOptions, Comment, CommentMention, Response } from "../types";

interface Props extends BaseServiceOptions {
  commentId: number;
}

function extractRelationId(value: number | { id: number } | null | undefined): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "id" in value) return Number(value.id);
  return null;
}

export async function markCommentRead({ commentId, payload: payloadProp }: Props): Promise<Response<{ alreadyRead: boolean }>> {
  try {
    const payload = await extractPayload(payloadProp);
    const { user } = await payload.auth({ headers: await headers() });

    if (!user) return { success: false, error: "Unauthorized" };

    const comment = (await payload.findByID({
      collection: DEFAULT_COLLECTION_SLUG,
      id: commentId,
      depth: 0,
      overrideAccess: true,
    })) as Comment;

    if (!comment) {
      return {
        success: false,
        error: "Comment not found",
      };
    }

    const tenantId = await getCurrentTenantId(payload);
    if (tenantId && extractRelationId(comment.tenant as number | { id: number } | null) !== tenantId) {
      return { success: false, error: "Forbidden" };
    }

    if (extractRelationId(comment.author as number | { id: number }) === user.id) {
      return {
        success: true,
        data: { alreadyRead: true },
      };
    }

    if (comment.isResolved) {
      return {
        success: true,
        data: { alreadyRead: true },
      };
    }

    const mentions = (comment.mentions ?? []) as CommentMention[];
    const isMentioned = mentions.some((m) => extractRelationId(m.user as number | { id: number } | null) === user.id);
    if (!isMentioned) {
      return {
        success: false,
        error: "Not mentioned",
      };
    }

    const { docs: existing } = await payload.find({
      collection: COMMENT_READS_COLLECTION_SLUG,
      where: {
        and: [{ comment: { equals: commentId } }, { user: { equals: user.id } }],
      },
      limit: 5,
      depth: 0,
      overrideAccess: true,
      sort: "readAt",
    });

    if (existing.length > 0) {
      if (existing.length > 1) {
        for (const extra of existing.slice(1)) {
          await payload.delete({
            collection: COMMENT_READS_COLLECTION_SLUG,
            id: extra.id,
            overrideAccess: true,
          });
        }
      }

      return {
        success: true,
        data: { alreadyRead: true },
      };
    }

    await payload.create({
      collection: COMMENT_READS_COLLECTION_SLUG,
      data: {
        comment: commentId,
        user: user.id,
        readAt: new Date().toISOString(),
      },
      overrideAccess: false,
      user,
    });

    const { docs: after } = await payload.find({
      collection: COMMENT_READS_COLLECTION_SLUG,
      where: {
        and: [{ comment: { equals: commentId } }, { user: { equals: user.id } }],
      },
      limit: 5,
      depth: 0,
      overrideAccess: true,
      sort: "readAt",
    });

    if (after.length > 1) {
      for (const extra of after.slice(1)) {
        await payload.delete({
          collection: COMMENT_READS_COLLECTION_SLUG,
          id: extra.id as number,
          overrideAccess: true,
        });
      }
    }

    return {
      success: true,
      data: { alreadyRead: false },
    };
  } catch (err) {
    console.error("markCommentRead failed:", err);

    return {
      success: false,
      error: getDefaultErrorMessage(err),
    };
  }
}
