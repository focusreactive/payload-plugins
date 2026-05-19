"use client";

import { useMutation } from "@tanstack/react-query";
import { markCommentRead } from "../../services/markCommentRead";
import { useCommentsQueryClient } from "../../providers/CommentsQueryClientProvider";
import { useUnreadMentions } from "../../providers/UnreadMentionsProvider";

interface Variables {
  commentId: number;
}

interface CountCache {
  count: number;
}

const UNREAD_COUNT_KEY_PREFIX = ["unread-mentions-count"] as const;

export function useMarkCommentReadMutation() {
  const queryClient = useCommentsQueryClient();
  const { rememberRead } = useUnreadMentions();

  return useMutation(
    {
      mutationFn: ({ commentId }: Variables) => markCommentRead({ commentId }),
      onMutate: async ({ commentId }) => {
        rememberRead(commentId);

        await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_KEY_PREFIX });
        queryClient.setQueriesData<CountCache>({ queryKey: UNREAD_COUNT_KEY_PREFIX }, (prev) =>
          prev ? { count: Math.max(0, prev.count - 1) } : prev,
        );
      },
      onError: () => {
        queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY_PREFIX });
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY_PREFIX });
      },
    },
    queryClient,
  );
}
