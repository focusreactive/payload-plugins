"use server";

import { headers } from "next/headers";

import { DEFAULT_COLLECTION_SLUG, FALLBACK_USERNAME } from "../constants";
import type { Response, Comment, BaseServiceOptions } from "../types";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import { extractPayload } from "../utils/payload/extractPayload";
import { sendMentionEmails } from "./sendMentionEmails";

interface Props extends BaseServiceOptions {
  documentId?: number | null;
  collectionSlug?: string | null;
  globalSlug?: string | null;
  text: string;
  fieldPath?: string | null;
  mentionIds?: number[];
}

export async function createComment({
  documentId,
  collectionSlug,
  globalSlug,
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
        error: "Unauthorized",
        success: false,
      };
    }

    if (!globalSlug && (!documentId || !collectionSlug)) {
      return {
        error: "No document registered",
        success: false,
      };
    }

    const mentions = mentionIds.map((id) => ({ user: id }));

    const data = globalSlug
      ? {
          author: user.id,
          collectionSlug: null,
          documentId: null,
          fieldPath,
          globalSlug,
          isResolved: false,
          locale,
          mentions,
          text,
        }
      : {
          author: user.id,
          collectionSlug,
          documentId,
          fieldPath,
          isResolved: false,
          locale,
          mentions,
          text,
        };

    const comment = (await payload.create({
      collection: DEFAULT_COLLECTION_SLUG,
      data,
      overrideAccess: false,
      user,
    })) as Comment;

    if (mentionIds.length > 0) {
      sendMentionEmails({
        authorName: user.name ?? user.email ?? FALLBACK_USERNAME,
        collectionSlug: collectionSlug ?? globalSlug ?? "",
        commentText: text,
        documentId: documentId,
        mentionIds,
        payload,
      });
    }

    return {
      data: comment,
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: getDefaultErrorMessage(error),
    };
  }
}
