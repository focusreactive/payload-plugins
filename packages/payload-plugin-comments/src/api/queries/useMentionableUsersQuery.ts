"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "../queryKeys";
import { fetchMentionableUsers } from "../../services/fetchMentionableUsers";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { REFETCH_INTERVAL } from "../../constants";

export function useMentionableUsersQuery() {
  const { isOpen } = useCommentsDrawer();

  return useQuery({
    queryKey: QUERY_KEYS.mentionableUsers(),
    queryFn: async () => {
      const res = await fetchMentionableUsers();

      if (!res.success) throw new Error(res.error);

      return res.data;
    },
    enabled: isOpen,
    staleTime: 0,
    refetchInterval: isOpen ? REFETCH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}
