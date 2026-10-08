"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "../queryKeys";
import { useCommentsRequest } from "../useCommentsRequest";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { useCommentsQueryClient } from "../../providers/CommentsQueryClientProvider";
import { COMMENTS_ENDPOINT_PATHS, REFETCH_INTERVAL } from "../../constants";
import type { User } from "../../types";

export function useMentionableUsersQuery() {
  const queryClient = useCommentsQueryClient();
  const { isOpen } = useCommentsDrawer();
  const request = useCommentsRequest();

  return useQuery(
    {
      queryKey: QUERY_KEYS.mentionableUsers(),
      queryFn: async () => {
        const res = await request<object, User[]>(COMMENTS_ENDPOINT_PATHS.mentionableUsers, {});

        if (!res.success) throw new Error(res.error);

        return res.data;
      },
      enabled: isOpen,
      staleTime: 0,
      refetchInterval: isOpen ? REFETCH_INTERVAL : false,
      refetchIntervalInBackground: false,
    },
    queryClient
  );
}
