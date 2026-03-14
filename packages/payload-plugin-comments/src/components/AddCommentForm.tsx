"use client";

import { useState, useTransition, useRef } from "react";
import { cn } from "../utils/general/cn";
import { useComments } from "../providers/CommentsProvider";
import { useLocale, useTranslation } from "@payloadcms/ui";
import { CommentEditor } from "./CommentEditor";
import type { CommentEditorHandle } from "./CommentEditor";

interface AddCommentFormProps {
  fieldPath?: string | null;
  documentId?: number;
  collectionSlug?: string;
  globalSlug?: string;
}

export function AddCommentForm({ fieldPath, documentId, collectionSlug, globalSlug }: AddCommentFormProps) {
  const { addComment } = useComments();
  const { code: locale } = useLocale();
  const { t } = useTranslation();

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const editorRef = useRef<CommentEditorHandle>(null);

  function handleSubmit() {
    const serialized = editorRef.current?.getValue() ?? "";
    if (!serialized) return;

    setError(null);
    editorRef.current?.clear();

    startTransition(async () => {
      const result = await addComment(serialized, fieldPath, documentId, collectionSlug, locale, globalSlug);

      if (!result.success) {
        setError(result.error ?? t("comments:failedToPost" as never));
      }
    });
  }

  return (
    <div className="mt-4">
      <CommentEditor ref={editorRef} disabled={isPending} onEnterPress={handleSubmit} />

      {error && <p className="text-(--theme-error-500) text-xs mt-1 mb-0">{error}</p>}

      <div className="flex items-center justify-between mt-1.5">
        <button
          type="button"
          onClick={() => editorRef.current?.insertAt()}
          disabled={isPending}
          className="rounded border border-(--theme-elevation-200) px-2 py-1 text-[13px] text-(--theme-elevation-500) hover:bg-(--theme-elevation-100) disabled:cursor-not-allowed">
          @
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className={cn(
            "rounded border-none px-4 py-1.5 text-[13px] font-semibold transition-colors",
            !isPending ?
              "cursor-pointer bg-(--theme-success-500,#2d9a6a) text-white"
            : "cursor-not-allowed bg-(--theme-elevation-150) text-(--theme-elevation-450)",
          )}>
          {isPending ? t("comments:posting" as never) : t("comments:comment" as never)}
        </button>
      </div>
    </div>
  );
}
