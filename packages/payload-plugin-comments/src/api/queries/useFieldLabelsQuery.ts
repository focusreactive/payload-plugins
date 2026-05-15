"use client";

import { useQuery } from "@tanstack/react-query";

import { REFETCH_INTERVAL } from "../../constants";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { fetchFieldLabels } from "../../services/fieldLabels/fetchFieldLabels";
import type { QueryContext } from "../../types";
import { getFieldLabelsKey } from "../queryKeys";
import { useCommentsQuery } from "./useCommentsQuery";

export function useFieldLabelsQuery(ctx: QueryContext) {
  const { isOpen } = useCommentsDrawer();
  const { data: comments } = useCommentsQuery(ctx);

  return useQuery({
    enabled: isOpen && !!comments,
    queryFn: () => fetchFieldLabels(comments ?? []),
    queryKey: getFieldLabelsKey(ctx),
    refetchInterval: isOpen ? REFETCH_INTERVAL : false,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}
