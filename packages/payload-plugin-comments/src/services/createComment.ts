"use server";

import { headers } from "next/headers";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";
import type { Response, Comment, BaseServiceOptions } from "../types";
import { DEFAULT_COLLECTION_SLUG, FALLBACK_USERNAME } from "../constants";
import { sendMentionEmails } from "./sendMentionEmails";
import { extractPayload } from "../utils/payload/extractPayload";

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
        success: false,
        error: "Unauthorized",
      };
    }

    if (!globalSlug && (!documentId || !collectionSlug)) {
      return {
        success: false,
        error: "No document registered",
      };
    }

    const mentions = mentionIds.map((id) => ({ user: id }));

    const data =
      globalSlug ?
        {
          globalSlug,
          documentId: null,
          collectionSlug: null,
          fieldPath,
          locale,
          text,
          author: user.id,
          isResolved: false,
          mentions,
        }
      : {
          documentId,
          collectionSlug,
          fieldPath,
          locale,
          text,
          author: user.id,
          isResolved: false,
          mentions,
        };

    const comment = (await payload.create({
      collection: DEFAULT_COLLECTION_SLUG,
      data,
      overrideAccess: false,
      user,
    })) as Comment;

    if (mentionIds.length > 0) {
      sendMentionEmails({
        mentionIds,
        authorName: user.name ?? user.email ?? FALLBACK_USERNAME,
        commentText: text,
        collectionSlug: collectionSlug ?? globalSlug ?? "",
        documentId: documentId,
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
