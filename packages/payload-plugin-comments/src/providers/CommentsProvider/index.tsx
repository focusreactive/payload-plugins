"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useOptimistic,
  useState,
} from "react";
import { useAuth, useLocale } from "@payloadcms/ui";
import { usePathname } from "next/navigation";
import type { Comment, User } from "../../types";
import { createComment } from "../../services/createComment";
import { deleteComment } from "../../services/deleteComment";
import { resolveComment as resolveCommentService } from "../../services/resolveComment";
import { syncAllCommentsData } from "../../services/syncAllCommentsData";
import type {
  CollectionLabels,
  FilterMode,
  GlobalFieldLabelRegistry,
  LoadingStatus,
  DocumentTitles,
  MentionUser,
  Mode,
} from "../../types";
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
  collectionLabels: CollectionLabels;
  mode: Mode;
  collectionSlug: string | null | undefined;
  documentId: number | null | undefined;
  mentionUsers: MentionUser[];
  loadError: boolean;
  filter: FilterMode;
  fieldLabelRegistry: GlobalFieldLabelRegistry;
  setFilter: Dispatch<SetStateAction<FilterMode>>;
  hydrateComments: (
    incoming?: Comment[],
    incomingTitles?: DocumentTitles,
    incomingMentionUsers?: MentionUser[],
    fieldLabels?: GlobalFieldLabelRegistry,
    incomingCollectionLabels?: CollectionLabels,
    nextLoadError?: boolean,
  ) => void;
  syncCommentsStatus: LoadingStatus;
  syncComments: () => Promise<void>;
  addComment: (
    text: string,
    fieldPath?: string | null,
    documentId?: number,
    collectionSlug?: string,
    locale?: string | null,
  ) => Promise<MutationResult>;
  removeComment: (id: string | number) => Promise<MutationResult>;
  resolveComment: (id: string | number, resolved: boolean) => Promise<MutationResult>;
  updateDocumentTitle: (collectionSlug: string, documentId: string, value: string) => void;
}

const CommentsContext = createContext<CommentsContextProps | null>(null);

interface Props {
  children: ReactNode;
}

export function CommentsProvider({ children }: Props) {
  const { user } = useAuth();
  const pathname = usePathname();
  const { code: currentLocale } = useLocale();

  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [optimisticComments, applyOptimistic] = useOptimistic<Comment[], OptimisticAction>(
    allComments,
    optimisticReducer,
  );

  const [documentTitles, setDocumentTitles] = useState<DocumentTitles>({});
  const [collectionLabels, setCollectionLabels] = useState<CollectionLabels>({});
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [fieldLabelRegistry, setFieldLabelRegistry] = useState<GlobalFieldLabelRegistry>({});
  const [filter, setFilter] = useState<FilterMode>("open");
  const [loadError, setLoadError] = useState(false);
  const [syncCommentsStatus, setSyncCommentsStatus] = useState<LoadingStatus>("idle");

  const { mode, collectionSlug, documentId } = defineModeByPathname(pathname);

  const visibleComments = extractVisibleComments({
    comments: optimisticComments,
    mode,
    collectionSlug,
    documentId,
    currentLocale,
  });

  const hydrateComments = useCallback(
    (
      incoming?: Comment[],
      incomingTitles?: DocumentTitles,
      incomingMentionUsers?: MentionUser[],
      fieldLabels?: GlobalFieldLabelRegistry,
      incomingCollectionLabels?: CollectionLabels,
      nextLoadError = false,
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
  ): Promise<MutationResult> => {
    const resolvedDocId = documentIdOverride ?? documentId;
    const resolvedSlug = collectionSlugOverride ?? collectionSlug;

    if (!resolvedDocId || !resolvedSlug) {
      return {
        success: false,
        error: "No document registered",
      };
    }

    const tempId = -Date.now();

    const mentionIds = parseMentionIds(text);
    const selectedMentionUsers = mentionUsers.filter(({ id }) => mentionIds.includes(id));
    const mentions = selectedMentionUsers.map((user) => ({ id: null, user: user as User }));

    const optimisticComment: Comment = {
      id: tempId,
      text,
      fieldPath,
      locale: locale ?? null,
      documentId: resolvedDocId,
      collectionSlug: resolvedSlug,
      isResolved: false,
      mentions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: user as unknown as Comment["author"],
    };

    applyOptimistic({ type: "add", comment: optimisticComment });

    const result = await createComment({
      documentId: resolvedDocId,
      collectionSlug: resolvedSlug,
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
        mode,
        collectionSlug,
        documentId,
        mentionUsers,
        loadError,
        filter,
        fieldLabelRegistry,
        setFilter,
        hydrateComments,
        syncCommentsStatus,
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
