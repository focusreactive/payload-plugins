"use client";

import { useQuery } from "@tanstack/react-query";

import { REFETCH_INTERVAL } from "../../constants";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { fetchMentionableUsers } from "../../services/fetchMentionableUsers";
import { QUERY_KEYS } from "../queryKeys";

export function useMentionableUsersQuery() {
  const { isOpen } = useCommentsDrawer();

  return useQuery({
    enabled: isOpen,
    queryFn: async () => {
      const res = await fetchMentionableUsers();

      if (!res.success) throw new Error(res.error);

      return res.data;
    },
    queryKey: QUERY_KEYS.mentionableUsers(),
    refetchInterval: isOpen ? REFETCH_INTERVAL : false,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}
