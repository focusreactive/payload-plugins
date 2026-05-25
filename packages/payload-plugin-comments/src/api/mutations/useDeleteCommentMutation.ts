"use client";

import { useMutation } from "@tanstack/react-query";
import { getCommentsKey } from "../queryKeys";
import { deleteComment } from "../../services/deleteComment";
import { useCommentsQueryClient } from "../../providers/CommentsQueryClientProvider";
import type { Comment, QueryContext } from "../../types";

interface DeleteCommentVariables {
  ctx: QueryContext;
  commentId: string | number;
}

export function useDeleteCommentMutation() {
  const queryClient = useCommentsQueryClient();

  return useMutation(
    {
      mutationFn: ({ commentId }: DeleteCommentVariables) => deleteComment(commentId),
      onMutate: async (variables) => {
        const { ctx, commentId } = variables;
        const key = getCommentsKey(ctx);

        await queryClient.cancelQueries({ queryKey: key });
        const snapshot = queryClient.getQueryData<Comment[]>(key);

        queryClient.setQueryData<Comment[]>(key, (prev = []) => prev.filter((c) => c.id !== commentId));

        return { snapshot, ctx };
      },
      onError: (_err, _vars, context) => {
        if (context?.snapshot !== undefined) {
          queryClient.setQueryData(getCommentsKey(context.ctx), context.snapshot);
        }
      },
      onSettled: (_data, _err, _vars, context) => {
        if (!context?.ctx) return;

        queryClient.invalidateQueries({ queryKey: getCommentsKey(context.ctx) });
      },
    },
    queryClient,
  );
}
