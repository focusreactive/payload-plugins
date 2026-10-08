"use client";

import { useQuery } from "@tanstack/react-query";
import { useConfig } from "@payloadcms/ui";
import { getCommentsKey } from "../queryKeys";
import type { FindAllCommentsArgs } from "../../services/findAllComments";
import { useCommentsRequest } from "../useCommentsRequest";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { useCommentsQueryClient } from "../../providers/CommentsQueryClientProvider";
import type { Comment, QueryContext } from "../../types";
import type { CommentsPluginConfigStorage } from "../../types";
import { COMMENTS_ENDPOINT_PATHS, REFETCH_INTERVAL } from "../../constants";

export function useCommentsQuery(ctx: QueryContext) {
  const queryClient = useCommentsQueryClient();
  const { isOpen } = useCommentsDrawer();
  const { config } = useConfig();
  const request = useCommentsRequest();
  const pluginConfig = config.admin?.custom?.commentsPlugin as
    | CommentsPluginConfigStorage
    | undefined;

  return useQuery(
    {
      queryKey: getCommentsKey(ctx),
      queryFn: async () => {
        const params: FindAllCommentsArgs =
          ctx.mode === "doc"
            ? {
                enabledCollections: pluginConfig?.collections,
                enabledGlobals: pluginConfig?.globals,
                docId: ctx.docId,
                filterCollectionSlug: ctx.collectionSlug,
              }
            : ctx.mode === "global-doc"
              ? {
                  enabledCollections: pluginConfig?.collections,
                  enabledGlobals: pluginConfig?.globals,
                  filterGlobalSlug: ctx.globalSlug,
                }
              : {
                  enabledCollections: pluginConfig?.collections,
                  enabledGlobals: pluginConfig?.globals,
                };

        const res = await request<FindAllCommentsArgs, Comment[]>(
          COMMENTS_ENDPOINT_PATHS.list,
          params
        );

        if (!res.success) throw new Error(res.error);

        return res.data;
      },
      staleTime: 0,
      refetchInterval: isOpen ? REFETCH_INTERVAL : false,
      refetchIntervalInBackground: false,
    },
    queryClient
  );
}
