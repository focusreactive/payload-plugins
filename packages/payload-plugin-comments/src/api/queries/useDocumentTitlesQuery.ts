"use client";

import { useQuery } from "@tanstack/react-query";
import { useConfig } from "@payloadcms/ui";
import { useLocale } from "@payloadcms/ui";
import { getDocumentTitlesKey } from "../queryKeys";
import { getDocumentTitles } from "../../services/getDocumentTitles";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { useCommentsQuery } from "./useCommentsQuery";
import type { QueryContext } from "../../types";
import type { CommentsPluginConfigStorage } from "../../types";
import { REFETCH_INTERVAL } from "../../constants";

export function useDocumentTitlesQuery(ctx: QueryContext) {
  const { isOpen } = useCommentsDrawer();
  const { data: comments } = useCommentsQuery(ctx);
  const { code: locale } = useLocale();
  const { config } = useConfig();

  const pluginConfig = config.admin?.custom?.commentsPlugin as CommentsPluginConfigStorage | undefined;

  return useQuery({
    queryKey: getDocumentTitlesKey(ctx),
    queryFn: async () => {
      const res = await getDocumentTitles(comments ?? [], pluginConfig?.documentTitleFields ?? {}, { locale });

      if (!res.success) throw new Error(res.error);

      return res.data;
    },
    enabled: isOpen && !!comments,
    staleTime: 0,
    refetchInterval: isOpen ? REFETCH_INTERVAL : false,
    refetchIntervalInBackground: false,
  });
}
