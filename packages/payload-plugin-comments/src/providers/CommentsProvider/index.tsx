"use client";

import { useAuth, useConfig } from "@payloadcms/ui";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext } from 'react';
import type { ReactNode } from 'react';

import { useAddCommentMutation } from "../../api/mutations/useAddCommentMutation";
import { useDeleteCommentMutation } from "../../api/mutations/useDeleteCommentMutation";
import { useResolveCommentMutation } from "../../api/mutations/useResolveCommentMutation";
import { getEntitiesLabels } from "../../services/getEntitiesLabels";
import type {
  EntityLabelsMap,
  Comment,
  CommentsPluginConfigStorage,
} from "../../types";
import type { QueryContext } from "../../types";
import type { EntityConfig } from "../../types";
import type { Mode } from "../../types";
import { getDefaultErrorMessage } from "../../utils/error/getDefaultErrorMessage";
import { parseMentionIds } from "../../utils/mention/parseMentionIds";
import { defineModeByPathname } from "../../utils/mode/defineModeByPathname";
import { toQueryContext } from "../../utils/query/toQueryContext";

interface MutationResult {
  success: boolean;
  error?: string;
}

interface CommentsContextProps {
  mode: Mode;
  collectionSlug: string | null | undefined;
  documentId: number | null | undefined;
  globalSlug: string | null;
  queryContext: QueryContext;
  collectionLabels: EntityLabelsMap;
  globalLabels: EntityLabelsMap;
  usernameFieldPath: string | undefined;
  addComment: (
    text: string,
    fieldPath?: string | null,
    documentId?: number,
    collectionSlug?: string,
    locale?: string | null,
    globalSlugOverride?: string
  ) => Promise<MutationResult>;
  removeComment: (id: string | number) => Promise<MutationResult>;
  resolveComment: (
    id: string | number,
    resolved: boolean
  ) => Promise<MutationResult>;
}

const CommentsContext = createContext<CommentsContextProps | null>(null);

interface Props {
  children: ReactNode;
  usernameFieldPath?: string;
}

export function CommentsProvider({ children, usernameFieldPath }: Props) {
  const { user } = useAuth();
  const pathname = usePathname();
  const { config } = useConfig();

  const { mode, collectionSlug, documentId, globalSlug } =
    defineModeByPathname(pathname);
  const queryContext = toQueryContext(
    mode,
    collectionSlug,
    documentId,
    globalSlug
  );

  const pluginConfig = config.admin?.custom?.commentsPlugin as
    | CommentsPluginConfigStorage
    | undefined;
  const collectionLabels = getEntitiesLabels(
    (config.collections ?? []) as unknown as EntityConfig[],
    pluginConfig?.collections ?? []
  );
  const globalLabels = getEntitiesLabels(
    (config.globals ?? []) as unknown as EntityConfig[],
    pluginConfig?.globals ?? []
  );

  const addMutation = useAddCommentMutation();
  const deleteMutation = useDeleteCommentMutation();
  const resolveMutation = useResolveCommentMutation();

  const addComment = useCallback(
    async (
      text: string,
      fieldPath?: string | null,
      documentIdOverride?: number,
      collectionSlugOverride?: string,
      locale?: string | null,
      globalSlugOverride?: string
    ): Promise<MutationResult> => {
      const resolvedGlobalSlug =
        globalSlugOverride ?? (mode === "global-document" ? globalSlug : null);
      const resolvedDocId = documentIdOverride ?? documentId;
      const resolvedSlug = collectionSlugOverride ?? collectionSlug;

      if (!resolvedGlobalSlug && (!resolvedDocId || !resolvedSlug)) {
        return {
          error: "No document registered",
          success: false,
        };
      }

      try {
        const res = await addMutation.mutateAsync({
          collectionSlug: resolvedGlobalSlug ? null : resolvedSlug,
          ctx: queryContext,
          currentUser: user as Comment["author"],
          documentId: resolvedGlobalSlug ? null : resolvedDocId,
          fieldPath: fieldPath ?? null,
          globalSlug: resolvedGlobalSlug ?? null,
          locale: locale ?? null,
          mentionIds: parseMentionIds(text),
          text,
        });

        if (!res.success)
          {return {
            success: false,
            error: res.error,
          };}

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: getDefaultErrorMessage(error),
        };
      }
    },
    [
      addMutation,
      mode,
      globalSlug,
      documentId,
      collectionSlug,
      queryContext,
      user,
    ]
  );

  const removeComment = useCallback(
    async (id: string | number): Promise<MutationResult> => {
      try {
        const res = await deleteMutation.mutateAsync({
          commentId: id,
          ctx: queryContext,
        });

        if (!res.success)
          {return {
            success: false,
            error: res.error,
          };}

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: getDefaultErrorMessage(error),
        };
      }
    },
    [deleteMutation, queryContext]
  );

  const resolveComment = useCallback(
    async (id: string | number, resolved: boolean): Promise<MutationResult> => {
      try {
        const res = await resolveMutation.mutateAsync({
          commentId: id,
          ctx: queryContext,
          currentUser: user as Comment["author"],
          resolved,
        });

        if (!res.success)
          {return {
            success: false,
            error: res.error,
          };}

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: getDefaultErrorMessage(error),
        };
      }
    },
    [resolveMutation, queryContext, user]
  );

  return (
    <CommentsContext.Provider
      value={{
        addComment,
        collectionLabels,
        collectionSlug,
        documentId,
        globalLabels,
        globalSlug,
        mode,
        queryContext,
        removeComment,
        resolveComment,
        usernameFieldPath,
      }}
    >
      {children}
    </CommentsContext.Provider>
  );
}

export function useComments() {
  const context = useContext(CommentsContext);

  if (!context)
    {throw new Error("useComments must be used within a CommentsProvider");}

  return context;
}
