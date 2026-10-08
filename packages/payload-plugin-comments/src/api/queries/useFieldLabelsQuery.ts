"use client";

import { useQuery } from "@tanstack/react-query";
import { getFieldLabelsKey } from "../queryKeys";
import type { FetchFieldLabelsArgs } from "../../services/fieldLabels/fetchFieldLabels";
import { useCommentsRequest } from "../useCommentsRequest";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { useCommentsQueryClient } from "../../providers/CommentsQueryClientProvider";
import { useCommentsQuery } from "./useCommentsQuery";
import type { GlobalFieldLabelRegistry, QueryContext } from "../../types";
import { COMMENTS_ENDPOINT_PATHS, REFETCH_INTERVAL } from "../../constants";

export function useFieldLabelsQuery(ctx: QueryContext) {
  const queryClient = useCommentsQueryClient();
  const { isOpen } = useCommentsDrawer();
  const { data: comments } = useCommentsQuery(ctx);
  const request = useCommentsRequest();

  return useQuery(
    {
      queryKey: getFieldLabelsKey(ctx),
      queryFn: async () => {
        const res = await request<FetchFieldLabelsArgs, GlobalFieldLabelRegistry>(
          COMMENTS_ENDPOINT_PATHS.fieldLabels,
          { comments: comments ?? [] }
        );

        if (!res.success) throw new Error(res.error);

        return res.data;
      },
      enabled: isOpen && !!comments,
      staleTime: 0,
      refetchInterval: isOpen ? REFETCH_INTERVAL : false,
      refetchIntervalInBackground: false,
    },
    queryClient
  );
}
