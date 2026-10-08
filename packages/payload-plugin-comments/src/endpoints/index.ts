import type { Endpoint } from "payload";
import { COMMENTS_ENDPOINT_PATHS } from "../constants";
import { countUnreadMentions } from "../services/countUnreadMentions";
import { createComment } from "../services/createComment";
import { deleteComment } from "../services/deleteComment";
import { fetchMentionableUsers } from "../services/fetchMentionableUsers";
import { fetchFieldLabels } from "../services/fieldLabels/fetchFieldLabels";
import { findAllComments } from "../services/findAllComments";
import { getDocumentTitles } from "../services/getDocumentTitles";
import { markCommentRead } from "../services/markCommentRead";
import { resolveComment } from "../services/resolveComment";
import { defineEndpoint } from "./defineEndpoint";

export const commentsEndpoints: Endpoint[] = [
  defineEndpoint(COMMENTS_ENDPOINT_PATHS.list, findAllComments),
  defineEndpoint(COMMENTS_ENDPOINT_PATHS.create, createComment),
  defineEndpoint(COMMENTS_ENDPOINT_PATHS.delete, deleteComment),
  defineEndpoint(COMMENTS_ENDPOINT_PATHS.resolve, resolveComment),
  defineEndpoint(COMMENTS_ENDPOINT_PATHS.markRead, markCommentRead),
  defineEndpoint(COMMENTS_ENDPOINT_PATHS.unreadMentionsCount, countUnreadMentions),
  defineEndpoint(COMMENTS_ENDPOINT_PATHS.mentionableUsers, fetchMentionableUsers),
  defineEndpoint(COMMENTS_ENDPOINT_PATHS.documentTitles, getDocumentTitles),
  defineEndpoint(COMMENTS_ENDPOINT_PATHS.fieldLabels, fetchFieldLabels),
];
