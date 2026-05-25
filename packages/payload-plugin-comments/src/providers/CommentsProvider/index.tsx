"use client";

import { createContext, type ReactNode, useCallback, useContext } from "react";
import { useAuth, useConfig } from "@payloadcms/ui";
import { usePathname } from "next/navigation";
import type { EntityLabelsMap, Comment, CommentsPluginConfigStorage } from "../../types";
import type { QueryContext } from "../../types";
import { toQueryContext } from "../../utils/query/toQueryContext";
import { defineModeByPathname } from "../../utils/mode/defineModeByPathname";
import { getEntitiesLabels } from "../../services/getEntitiesLabels";
import type { EntityConfig } from "../../types";
import { parseMentionIds } from "../../utils/mention/parseMentionIds";
import { getDefaultErrorMessage } from "../../utils/error/getDefaultErrorMessage";
import { useAddCommentMutation } from "../../api/mutations/useAddCommentMutation";
import { useDeleteCommentMutation } from "../../api/mutations/useDeleteCommentMutation";
import { useResolveCommentMutation } from "../../api/mutations/useResolveCommentMutation";
import type { Mode } from "../../types";

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
    globalSlugOverride?: string,
  ) => Promise<MutationResult>;
  removeComment: (id: string | number) => Promise<MutationResult>;
  resolveComment: (id: string | number, resolved: boolean) => Promise<MutationResult>;
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

  const { mode, collectionSlug, documentId, globalSlug } = defineModeByPathname(pathname);
  const queryContext = toQueryContext(mode, collectionSlug, documentId, globalSlug);

  const pluginConfig = config.admin?.custom?.commentsPlugin as CommentsPluginConfigStorage | undefined;
  const collectionLabels = getEntitiesLabels(
    (config.collections ?? []) as unknown as EntityConfig[],
    pluginConfig?.collections ?? [],
  );
  const globalLabels = getEntitiesLabels(
    (config.globals ?? []) as unknown as EntityConfig[],
    pluginConfig?.globals ?? [],
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
      globalSlugOverride?: string,
    ): Promise<MutationResult> => {
      const resolvedGlobalSlug = globalSlugOverride ?? (mode === "global-document" ? globalSlug : null);
      const resolvedDocId = documentIdOverride ?? documentId;
      const resolvedSlug = collectionSlugOverride ?? collectionSlug;

      if (!resolvedGlobalSlug && (!resolvedDocId || !resolvedSlug)) {
        return {
          success: false,
          error: "No document registered",
        };
      }

      try {
        const res = await addMutation.mutateAsync({
          ctx: queryContext,
          text,
          fieldPath: fieldPath ?? null,
          documentId: resolvedGlobalSlug ? null : resolvedDocId,
          collectionSlug: resolvedGlobalSlug ? null : resolvedSlug,
          globalSlug: resolvedGlobalSlug ?? null,
          locale: locale ?? null,
          mentionIds: parseMentionIds(text),
          currentUser: user as Comment["author"],
        });

        if (!res.success)
          return {
            success: false,
            error: res.error,
          };

        return { success: true };
      } catch (e) {
        return {
          success: false,
          error: getDefaultErrorMessage(e),
        };
      }
    },
    [addMutation, mode, globalSlug, documentId, collectionSlug, queryContext, user],
  );

  const removeComment = useCallback(
    async (id: string | number): Promise<MutationResult> => {
      try {
        const res = await deleteMutation.mutateAsync({
          ctx: queryContext,
          commentId: id,
        });

        if (!res.success)
          return {
            success: false,
            error: res.error,
          };

        return { success: true };
      } catch (e) {
        return {
          success: false,
          error: getDefaultErrorMessage(e),
        };
      }
    },
    [deleteMutation, queryContext],
  );

  const resolveComment = useCallback(
    async (id: string | number, resolved: boolean): Promise<MutationResult> => {
      try {
        const res = await resolveMutation.mutateAsync({
          ctx: queryContext,
          commentId: id,
          resolved,
          currentUser: user as Comment["author"],
        });

        if (!res.success)
          return {
            success: false,
            error: res.error,
          };

        return { success: true };
      } catch (e) {
        return {
          success: false,
          error: getDefaultErrorMessage(e),
        };
      }
    },
    [resolveMutation, queryContext, user],
  );

  return (
    <CommentsContext.Provider
      value={{
        mode,
        collectionSlug,
        documentId,
        globalSlug,
        queryContext,
        collectionLabels,
        globalLabels,
        usernameFieldPath,
        addComment,
        removeComment,
        resolveComment,
      }}>
      {children}
    </CommentsContext.Provider>
  );
}

export function useComments() {
  const context = useContext(CommentsContext);

  if (!context) throw new Error("useComments must be used within a CommentsProvider");

  return context;
}
