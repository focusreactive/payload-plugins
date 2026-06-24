"use client";

import { useQuery } from "@tanstack/react-query";
import { useConfig } from "@payloadcms/ui";
import { getCommentsKey } from "../queryKeys";
import { findAllComments } from "../../services/findAllComments";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { useCommentsQueryClient } from "../../providers/CommentsQueryClientProvider";
import type { QueryContext } from "../../types";
import type { CommentsPluginConfigStorage } from "../../types";
import { REFETCH_INTERVAL } from "../../constants";

export function useCommentsQuery(ctx: QueryContext) {
  const queryClient = useCommentsQueryClient();
  const { isOpen } = useCommentsDrawer();
  const { config } = useConfig();
  const pluginConfig = config.admin?.custom?.commentsPlugin as
    | CommentsPluginConfigStorage
    | undefined;

  return useQuery(
    {
      queryKey: getCommentsKey(ctx),
      queryFn: async () => {
        const params =
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

        const res = await findAllComments(params);

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
