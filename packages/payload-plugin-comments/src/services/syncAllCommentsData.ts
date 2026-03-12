"use server";

import { findAllComments } from "./findAllComments";
import { getDocumentTitles } from "./getDocumentTitles";
import { fetchMentionableUsers } from "./fetchMentionableUsers";
import { fetchFieldLabels } from "./fieldLabels/fetchFieldLabels";
import { getCollectionLabels } from "./getCollectionLabels";
import type {
  BaseServiceOptions,
  CollectionLabels,
  Comment,
  CommentsPluginConfigStorage,
  DocumentTitles,
  GlobalFieldLabelRegistry,
  Response,
  User,
} from "../types";
import { extractPayload } from "../utils/payload/extractPayload";

interface SyncResult {
  comments: Comment[];
  documentTitles: DocumentTitles;
  mentionUsers: User[];
  fieldLabels: GlobalFieldLabelRegistry;
  collectionLabels: CollectionLabels;
}

const errorResult: Response<SyncResult> = {
  success: false,
  error: "Failed to sync all comments data",
};

export async function syncAllCommentsData(options?: BaseServiceOptions): Promise<Response<SyncResult>> {
  const payload = await extractPayload(options?.payload);
  const pluginConfig = payload.config.admin?.custom?.commentsPlugin as CommentsPluginConfigStorage | undefined;

  const commentsResult = await findAllComments({
    enabledCollections: pluginConfig?.collections,
    options: {
      payload,
    },
  });

  if (!commentsResult.success) return errorResult;

  const comments = commentsResult.data;

  const [titlesResult, mentionUsersResult, fieldLabels] = await Promise.all([
    getDocumentTitles(comments, pluginConfig?.documentTitleFields ?? {}, { payload, locale: options?.locale }),
    fetchMentionableUsers({ payload }),
    fetchFieldLabels(comments),
  ]);

  const success = titlesResult.success && mentionUsersResult.success;

  if (!success) return errorResult;

  const collectionLabels = getCollectionLabels(payload, pluginConfig?.collections ?? []);

  return {
    success: true,
    data: {
      comments,
      documentTitles: titlesResult.data,
      mentionUsers: mentionUsersResult.data,
      fieldLabels,
      collectionLabels,
    },
  };
}
