"use client";

import { useConfig } from "@payloadcms/ui";
import { useLocale } from "@payloadcms/ui";
import { useQuery } from "@tanstack/react-query";

import { REFETCH_INTERVAL } from "../../constants";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { getDocumentTitles } from "../../services/getDocumentTitles";
import type { QueryContext } from "../../types";
import type { CommentsPluginConfigStorage } from "../../types";
import { getDocumentTitlesKey } from "../queryKeys";
import { useCommentsQuery } from "./useCommentsQuery";

export function useDocumentTitlesQuery(ctx: QueryContext) {
  const { isOpen } = useCommentsDrawer();
  const { data: comments } = useCommentsQuery(ctx);
  const { code: locale } = useLocale();
  const { config } = useConfig();

  const pluginConfig = config.admin?.custom?.commentsPlugin as
    | CommentsPluginConfigStorage
    | undefined;

  return useQuery({
    enabled: isOpen && !!comments,
    queryFn: async () => {
      const res = await getDocumentTitles(
        comments ?? [],
        pluginConfig?.documentTitleFields ?? {},
        { locale }
      );

      if (!res.success) throw new Error(res.error);

      return res.data;
    },
    queryKey: getDocumentTitlesKey(ctx),
    refetchInterval: isOpen ? REFETCH_INTERVAL : false,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}
