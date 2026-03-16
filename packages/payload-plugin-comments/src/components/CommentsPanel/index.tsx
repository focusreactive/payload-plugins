"use client";

import { useAuth } from "@payloadcms/ui";
import { cn } from "../../utils/general/cn";
import { useComments } from "../../providers/CommentsProvider";
import { filterComments } from "./utils/filterComments";
import { DocumentView } from "./components/DocumentView";
import { GlobalView } from "./components/GlobalView";
import { GlobalDocumentView } from "./components/GlobalDocumentView";
import { useScrollToTargetFieldGroup } from "./hooks/useScrollToTargetFieldGroup";

interface Props {
  className: string;
}

export const CommentsPanel = ({ className }: Props) => {
  const { user } = useAuth();
  const { visibleComments, filter, mode } = useComments();

  const userId = (user?.id as number) ?? null;
  const filteredComments = filterComments({
    comments: visibleComments,
    filter,
    currentUserId: userId ?? undefined,
  });

  useScrollToTargetFieldGroup();

  if (mode === "document") {
    return <DocumentView comments={filteredComments} userId={userId} className={cn(className)} />;
  }

  if (mode === "global-document") {
    return <GlobalDocumentView comments={filteredComments} userId={userId} className={cn(className)} />;
  }

  return <GlobalView comments={filteredComments} userId={userId} className={cn(className)} />;
};
