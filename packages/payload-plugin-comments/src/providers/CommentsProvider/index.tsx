"use client";

import { createContext, type ReactNode, useCallback, useContext, useOptimistic, useState } from "react";
import { useAuth, useLocale } from "@payloadcms/ui";
import { usePathname } from "next/navigation";
import type { Comment, EntityLabelsMap, User } from "../../types";
import { createComment } from "../../services/createComment";
import { deleteComment } from "../../services/deleteComment";
import { resolveComment as resolveCommentService } from "../../services/resolveComment";
import { syncAllCommentsData } from "../../services/syncAllCommentsData";
import type { GlobalFieldLabelRegistry, LoadingStatus, DocumentTitles, Mode } from "../../types";
import { parseMentionIds } from "../../utils/mention/parseMentionIds";
import { defineModeByPathname } from "../../utils/mode/defineModeByPathname";
import { extractVisibleComments } from "../../utils/comment/extractVisibleComments";

type OptimisticAction =
  | { type: "add"; comment: Comment }
  | { type: "remove"; id: string | number }
  | { type: "update"; comment: Comment };

function optimisticReducer(state: Comment[], action: OptimisticAction) {
  switch (action.type) {
    case "add":
      return [action.comment, ...state];
    case "remove":
      return state.filter(({ id }) => id !== action.id);
    case "update":
      return state.map((c) => (c.id === action.comment.id ? action.comment : c));
  }
}

interface MutationResult {
  success: boolean;
  error?: string;
}

interface CommentsContextProps {
  allComments: Comment[];
  visibleComments: Comment[];
  documentTitles: DocumentTitles;
  collectionLabels: EntityLabelsMap;
  globalLabels: EntityLabelsMap;
  mode: Mode;
  collectionSlug: string | null | undefined;
  documentId: number | null | undefined;
  globalSlug: string | null;
  mentionUsers: User[];
  loadError: boolean;
  fieldLabelRegistry: GlobalFieldLabelRegistry;
  syncCommentsStatus: LoadingStatus;
  usernameFieldPath: string | undefined;
  hydrateComments: (
    incoming?: Comment[],
    incomingTitles?: DocumentTitles,
    incomingMentionUsers?: User[],
    fieldLabels?: GlobalFieldLabelRegistry,
    incomingCollectionLabels?: EntityLabelsMap,
    nextLoadError?: boolean,
    incomingGlobalLabels?: EntityLabelsMap,
  ) => void;
  syncComments: () => Promise<void>;
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
  updateDocumentTitle: (collectionSlug: string, documentId: string, value: string) => void;
}

const CommentsContext = createContext<CommentsContextProps | null>(null);

interface Props {
  children: ReactNode;
  usernameFieldPath?: string;
}

export function CommentsProvider({ children, usernameFieldPath }: Props) {
  const { user } = useAuth();
  const pathname = usePathname();
  const { code: currentLocale } = useLocale();

  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [optimisticComments, applyOptimistic] = useOptimistic<Comment[], OptimisticAction>(
    allComments,
    optimisticReducer,
  );

  const [documentTitles, setDocumentTitles] = useState<DocumentTitles>({});
  const [collectionLabels, setCollectionLabels] = useState<EntityLabelsMap>({});
  const [globalLabels, setGlobalLabels] = useState<EntityLabelsMap>({});
  const [mentionUsers, setMentionUsers] = useState<User[]>([]);
  const [fieldLabelRegistry, setFieldLabelRegistry] = useState<GlobalFieldLabelRegistry>({});
  const [loadError, setLoadError] = useState(false);
  const [syncCommentsStatus, setSyncCommentsStatus] = useState<LoadingStatus>("idle");

  const { mode, collectionSlug, documentId, globalSlug } = defineModeByPathname(pathname);

  const visibleComments = extractVisibleComments({
    comments: optimisticComments,
    mode,
    collectionSlug,
    documentId,
    globalSlug,
    currentLocale,
  });

  const hydrateComments = useCallback(
    (
      incoming?: Comment[],
      incomingTitles?: DocumentTitles,
      incomingMentionUsers?: User[],
      fieldLabels?: GlobalFieldLabelRegistry,
      incomingCollectionLabels?: EntityLabelsMap,
      nextLoadError = false,
      incomingGlobalLabels?: EntityLabelsMap,
    ) => {
      if (incoming !== undefined) {
        setAllComments(incoming);
      }

      if (incomingTitles) {
        setDocumentTitles(incomingTitles);
      }

      if (incomingMentionUsers) {
        setMentionUsers(incomingMentionUsers);
      }

      if (fieldLabels) {
        setFieldLabelRegistry(fieldLabels);
      }

      if (incomingCollectionLabels) {
        setCollectionLabels(incomingCollectionLabels);
      }

      if (incomingGlobalLabels) {
        setGlobalLabels(incomingGlobalLabels);
      }

      setLoadError(nextLoadError);
    },
    [],
  );

  const addComment = async (
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

    const tempId = -Date.now();

    const mentionIds = parseMentionIds(text);
    const selectedMentionUsers = mentionUsers.filter(({ id }) => mentionIds.includes(id));
    const mentions = selectedMentionUsers.map((user) => ({ id: null, user }));

    const optimisticComment: Comment = {
      id: tempId,
      text,
      fieldPath,
      locale: locale ?? null,
      documentId: resolvedGlobalSlug ? null : resolvedDocId,
      collectionSlug: resolvedGlobalSlug ? null : resolvedSlug,
      globalSlug: resolvedGlobalSlug ?? null,
      isResolved: false,
      mentions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: user as Comment["author"],
    };

    applyOptimistic({ type: "add", comment: optimisticComment });

    const result = await createComment({
      documentId: resolvedGlobalSlug ? null : resolvedDocId,
      collectionSlug: resolvedGlobalSlug ? null : resolvedSlug,
      globalSlug: resolvedGlobalSlug,
      text,
      fieldPath,
      mentionIds,
      locale,
    });

    if (result.success) {
      applyOptimistic({ type: "remove", id: tempId });
      setAllComments((prev) => [result.data, ...prev.filter((c) => c.id !== tempId)]);

      return { success: true };
    }

    return {
      success: false,
      error: result.error,
    };
  };

  const removeComment = async (id: string | number): Promise<MutationResult> => {
    applyOptimistic({ type: "remove", id });

    const result = await deleteComment(id);

    if (result.success) {
      setAllComments((prev) => prev.filter((c) => c.id !== id));

      return { success: true };
    }

    return {
      success: false,
      error: result.error,
    };
  };

  const syncComments = async () => {
    setSyncCommentsStatus("loading");

    const allCommentsDataResult = await syncAllCommentsData({ locale: currentLocale });

    if (!allCommentsDataResult.success) {
      setSyncCommentsStatus("error");

      return;
    }

    const {
      comments,
      documentTitles,
      mentionUsers,
      fieldLabels,
      collectionLabels: syncedLabels,
      globalLabels: syncedGlobalLabels,
    } = allCommentsDataResult.data;

    setAllComments((prev) => {
      const serverIds = new Set(comments.map((c) => c.id));
      const localOnly = prev.filter((c) => c.id > 0 && !serverIds.has(c.id));

      return [...localOnly, ...comments];
    });
    setDocumentTitles(documentTitles);
    setMentionUsers(mentionUsers);
    setFieldLabelRegistry(fieldLabels);
    setCollectionLabels(syncedLabels);
    setGlobalLabels(syncedGlobalLabels);
    setSyncCommentsStatus("success");
  };

  const resolveComment = async (id: string | number, resolved: boolean): Promise<MutationResult> => {
    const existing = optimisticComments.find((c) => c.id === id);

    if (existing) {
      applyOptimistic({
        type: "update",
        comment: {
          ...existing,
          isResolved: resolved,
        },
      });
    }

    const result = await resolveCommentService(id, resolved);

    if (result.success) {
      setAllComments((prev) => prev.map((c) => (c.id === id ? result.data : c)));

      return { success: true };
    }

    return {
      success: false,
      error: result.error,
    };
  };

  const updateDocumentTitle = (collectionSlug: string, documentId: string, value: string) => {
    setDocumentTitles((prev) => ({
      ...prev,
      [collectionSlug]: {
        ...prev[collectionSlug],
        [documentId]: value,
      },
    }));
  };

  return (
    <CommentsContext.Provider
      value={{
        allComments: optimisticComments,
        visibleComments,
        documentTitles,
        collectionLabels,
        globalLabels,
        mode,
        collectionSlug,
        documentId,
        globalSlug,
        mentionUsers,
        loadError,
        fieldLabelRegistry,
        syncCommentsStatus,
        usernameFieldPath,
        hydrateComments,
        syncComments,
        addComment,
        removeComment,
        resolveComment,
        updateDocumentTitle,
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
