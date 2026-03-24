"use client";

import { useQuery } from "@tanstack/react-query";
import { getFieldLabelsKey } from "../queryKeys";
import { fetchFieldLabels } from "../../services/fieldLabels/fetchFieldLabels";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { useCommentsQuery } from "./useCommentsQuery";
import type { QueryContext } from "../../types";
import { REFETCH_INTERVAL } from "../../constants";

export function useFieldLabelsQuery(ctx: QueryContext) {
  const { isOpen } = useCommentsDrawer();
  const { data: comments } = useCommentsQuery(ctx);

  return useQuery({
    queryKey: getFieldLabelsKey(ctx),
    queryFn: () => fetchFieldLabels(comments ?? []),
    enabled: isOpen && !!comments,
    staleTime: 0,
    refetchInterval: isOpen ? REFETCH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}
