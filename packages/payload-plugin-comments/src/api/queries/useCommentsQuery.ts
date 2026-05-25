"use client";

import { useConfig } from "@payloadcms/ui";
import { useQuery } from "@tanstack/react-query";

import { REFETCH_INTERVAL } from "../../constants";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { findAllComments } from "../../services/findAllComments";
import type { QueryContext } from "../../types";
import type { CommentsPluginConfigStorage } from "../../types";
import { getCommentsKey } from "../queryKeys";

export function useCommentsQuery(ctx: QueryContext) {
  const { isOpen } = useCommentsDrawer();
  const { config } = useConfig();
  const pluginConfig = config.admin?.custom?.commentsPlugin as
    | CommentsPluginConfigStorage
    | undefined;

  return useQuery({
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
    queryKey: getCommentsKey(ctx),
    refetchInterval: isOpen ? REFETCH_INTERVAL : false,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}
