"use client";

import { useQuery } from "@tanstack/react-query";
import { useConfig } from "@payloadcms/ui";
import { useLocale } from "@payloadcms/ui";
import { getDocumentTitlesKey } from "../queryKeys";
import type { GetDocumentTitlesArgs } from "../../services/getDocumentTitles";
import { useCommentsRequest } from "../useCommentsRequest";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { useCommentsQueryClient } from "../../providers/CommentsQueryClientProvider";
import { useCommentsQuery } from "./useCommentsQuery";
import type { DocumentTitles, QueryContext } from "../../types";
import type { CommentsPluginConfigStorage } from "../../types";
import { COMMENTS_ENDPOINT_PATHS, REFETCH_INTERVAL } from "../../constants";

export function useDocumentTitlesQuery(ctx: QueryContext) {
  const queryClient = useCommentsQueryClient();
  const { isOpen } = useCommentsDrawer();
  const { data: comments } = useCommentsQuery(ctx);
  const { code: locale } = useLocale();
  const { config } = useConfig();
  const request = useCommentsRequest();

  const pluginConfig = config.admin?.custom?.commentsPlugin as
    | CommentsPluginConfigStorage
    | undefined;

  return useQuery(
    {
      queryKey: getDocumentTitlesKey(ctx),
      queryFn: async () => {
        const res = await request<GetDocumentTitlesArgs, DocumentTitles>(
          COMMENTS_ENDPOINT_PATHS.documentTitles,
          {
            comments: comments ?? [],
            documentTitleFields: pluginConfig?.documentTitleFields ?? {},
            locale,
          }
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
