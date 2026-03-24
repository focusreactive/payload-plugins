"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCommentsKey } from "../queryKeys";
import { resolveComment } from "../../services/resolveComment";
import type { Comment, QueryContext } from "../../types";

interface ResolveCommentVariables {
  ctx: QueryContext;
  commentId: string | number;
  resolved: boolean;
  currentUser: Comment["author"];
}

export function useResolveCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, resolved }: ResolveCommentVariables) => resolveComment(commentId, resolved),
    onMutate: async (variables) => {
      const { ctx, commentId, resolved, currentUser } = variables;
      const key = getCommentsKey(ctx);

      await queryClient.cancelQueries({ queryKey: key });
      const snapshot = queryClient.getQueryData<Comment[]>(key);

      queryClient.setQueryData<Comment[]>(key, (prev = []) =>
        prev.map((c) =>
          c.id === commentId ?
            {
              ...c,
              isResolved: resolved,
              resolvedAt: resolved ? new Date().toISOString() : null,
              resolvedBy: resolved ? currentUser : null,
            }
          : c,
        ),
      );

      return { snapshot, ctx };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(getCommentsKey(context.ctx), context.snapshot);
      }
    },
    onSettled: (_data, _err, _vars, context) => {
      if (!context?.ctx) return;

      void queryClient.invalidateQueries({ queryKey: getCommentsKey(context.ctx) });
    },
  });
}
