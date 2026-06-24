"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "../queryKeys";
import { countUnreadMentions } from "../../services/countUnreadMentions";
import { useCommentsQueryClient } from "../../providers/CommentsQueryClientProvider";
import { UNREAD_COUNT_REFETCH_INTERVAL } from "../../constants";
import type { Mode } from "../../types";

interface Props {
  mode: Mode;
  collectionSlug: string | null | undefined;
  documentId: number | null | undefined;
  globalSlug: string | null;
  locale: string | null | undefined;
}

export function useUnreadMentionsCountQuery({
  mode,
  collectionSlug,
  documentId,
  globalSlug,
  locale,
}: Props) {
  const queryClient = useCommentsQueryClient();

  return useQuery(
    {
      queryKey: QUERY_KEYS.unreadMentionsCount(
        mode,
        collectionSlug,
        documentId,
        globalSlug,
        locale
      ),
      queryFn: async () => {
        const res = await countUnreadMentions({
          mode,
          collectionSlug,
          documentId,
          globalSlug,
          locale,
        });

        if (!res.success) throw new Error(res.error);

        return res.data;
      },
      staleTime: 0,
      refetchInterval: UNREAD_COUNT_REFETCH_INTERVAL,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    },
    queryClient
  );
}
