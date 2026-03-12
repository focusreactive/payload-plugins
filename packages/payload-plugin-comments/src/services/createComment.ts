"use server";

import { headers } from "next/headers";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import type { Response, Comment, BaseServiceOptions } from "../types";
import { DEFAULT_COLLECTION_SLUG } from "../constants";
import { sendMentionEmails } from "./sendMentionEmails";
import { extractPayload } from "../utils/payload/extractPayload";

interface Props extends BaseServiceOptions {
  documentId: number;
  collectionSlug: string;
  text: string;
  fieldPath?: string | null;
  mentionIds?: number[];
}

export async function createComment({
  documentId,
  collectionSlug,
  text,
  fieldPath = null,
  mentionIds = [],
  locale = null,
  payload: payloadProp,
}: Props): Promise<Response<Comment>> {
  try {
    const payload = await extractPayload(payloadProp);
    const { user } = await payload.auth({ headers: await headers() });

    if (!user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const mentions = mentionIds.map((id) => ({ user: id }));

    const comment = (await payload.create({
      collection: DEFAULT_COLLECTION_SLUG,
      data: {
        documentId,
        collectionSlug,
        fieldPath,
        locale,
        text,
        author: user.id,
        isResolved: false,
        mentions,
      },
      overrideAccess: false,
      user,
    })) as Comment;

    if (mentionIds.length > 0) {
      sendMentionEmails({
        mentionIds,
        authorName: user.name ?? user.email ?? "Someone",
        commentText: text,
        collectionSlug,
        documentId,
        payload,
      });
    }

    return {
      success: true,
      data: comment,
    };
  } catch (err) {
    return {
      success: false,
      error: getDefaultErrorMessage(err),
    };
  }
}
