"use client";

import { useAuth, useLocale, useTranslation } from "@payloadcms/ui";

import { useCommentsQuery } from "../../api/queries/useCommentsQuery";
import { useCommentsFilter } from "../../providers/CommentsFilterProvider";
import { useComments } from "../../providers/CommentsProvider";
import { applyCommentFilters } from "../../utils/comment/applyCommentFilters";
import { filterCommentsByLocale } from "../../utils/comment/filterCommentsByLocale";
import { cn } from "../../utils/general/cn";
import { DocumentView } from "./components/DocumentView";
import { GlobalDocumentView } from "./components/GlobalDocumentView";
import { GlobalView } from "./components/GlobalView";
import { useScrollToTargetFieldGroup } from "./hooks/useScrollToTargetFieldGroup";

interface Props {
  className: string;
}

export const CommentsPanel = ({ className }: Props) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { code: currentLocale } = useLocale();
  const { filters } = useCommentsFilter();

  const { mode, queryContext } = useComments();
  const { data: allComments = [], isLoading } = useCommentsQuery(queryContext);

  const userId = (user?.id as number) ?? null;
  const localeFilteredComments = filterCommentsByLocale(
    allComments,
    currentLocale
  );
  const visibleComments = applyCommentFilters(
    localeFilteredComments,
    filters,
    userId
  );

  useScrollToTargetFieldGroup();

  if (isLoading && allComments.length === 0) {
    return (
      <div
        className={cn(
          className,
          "text-(--theme-elevation-450) text-[13px] text-center py-6 m-0"
        )}
      >
        {t("comments:loadingComments" as never)}
      </div>
    );
  }

  if (mode === "document") {
    return (
      <DocumentView
        comments={visibleComments}
        userId={userId}
        className={cn(className)}
      />
    );
  }

  if (mode === "global-document") {
    return (
      <GlobalDocumentView
        comments={visibleComments}
        userId={userId}
        className={cn(className)}
      />
    );
  }

  return (
    <GlobalView
      comments={visibleComments}
      userId={userId}
      className={cn(className)}
    />
  );
};
