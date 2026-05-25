"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createComment } from "../../services/createComment";
import type { Comment, User, QueryContext } from "../../types";
import {
  getCommentsKey,
  getFieldLabelsKey,
  getDocumentTitlesKey,
  QUERY_KEYS,
} from "../queryKeys";

interface AddCommentVariables {
  ctx: QueryContext;
  text: string;
  fieldPath?: string | null;
  documentId?: number | null;
  collectionSlug?: string | null;
  globalSlug?: string | null;
  locale?: string | null;
  mentionIds: number[];
  currentUser: Comment["author"];
}

export function useAddCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: ({
      ctx: _ctx,
      currentUser: _user,
      ...data
    }: AddCommentVariables) => createComment(data),
    onMutate: async (variables) => {
      const {
        ctx,
        text,
        fieldPath,
        documentId,
        collectionSlug,
        globalSlug,
        locale,
        mentionIds,
        currentUser,
      } = variables;

      const key = getCommentsKey(ctx);

      await queryClient.cancelQueries({ queryKey: key });
      const snapshot = queryClient.getQueryData<Comment[]>(key);

      const cachedUsers =
        queryClient.getQueryData<User[]>(QUERY_KEYS.mentionableUsers()) ?? [];
      const selectedUsers = cachedUsers.filter(({ id }) =>
        mentionIds.includes(id)
      );
      const mentions = selectedUsers.map((user) => ({ id: null, user }));

      const optimisticComment: Comment = {
        author: currentUser,
        collectionSlug: collectionSlug ?? null,
        createdAt: new Date().toISOString(),
        documentId: documentId ?? null,
        fieldPath: fieldPath ?? null,
        globalSlug: globalSlug ?? null,
        id: -Date.now(),
        isResolved: false,
        locale,
        mentions,
        text,
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Comment[]>(key, (prev = []) => [
        optimisticComment,
        ...prev,
      ]);

      return { ctx, snapshot };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(getCommentsKey(context.ctx), context.snapshot);
      }
    },
    onSettled: (_data, _err, _vars, context) => {
      if (!context?.ctx) {return;}

      const {ctx} = context;

      queryClient.invalidateQueries({ queryKey: getCommentsKey(ctx) });
      queryClient.invalidateQueries({ queryKey: getFieldLabelsKey(ctx) });
      queryClient.invalidateQueries({ queryKey: getDocumentTitlesKey(ctx) });
    },
  });
}
