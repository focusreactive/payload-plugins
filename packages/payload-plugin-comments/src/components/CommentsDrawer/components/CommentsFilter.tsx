"use client";

import { useAuth, useLocale, useTranslation } from "@payloadcms/ui";
import { CheckIcon } from "lucide-react";
import { useCommentsFilter } from "../../../providers/CommentsFilterProvider";
import { useComments } from "../../../providers/CommentsProvider";
import { useCommentsQuery } from "../../../api/queries/useCommentsQuery";
import { filterCommentsByLocale } from "../../../utils/comment/filterCommentsByLocale";
import { applyCommentFilters } from "../../../utils/comment/applyCommentFilters";
import { cn } from "../../../utils/general/cn";

export function CommentsFilter() {
  const { filters, setFilter } = useCommentsFilter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { code: locale } = useLocale();
  const { queryContext } = useComments();
  const { data: allComments = [] } = useCommentsQuery(queryContext);

  const inLocale = filterCommentsByLocale(allComments, locale);
  const resolvedCount = applyCommentFilters(
    inLocale,
    { ...filters, showResolved: true },
    (user?.id as number) ?? null
  ).filter((c) => c.isResolved).length;

  const options = [
    { key: "onlyMyThreads" as const, label: t("comments:onlyMyThreads" as never), count: null },
    { key: "showResolved" as const, label: t("comments:resolved" as never), count: resolvedCount },
  ];

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label={t("comments:filterComments" as never)}
    >
      {options.map(({ key, label, count }) => {
        const active = filters[key];

        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => setFilter(key, !active)}
            className={cn(
              "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-(--style-radius-s) border border-solid text-[12px] font-[inherit] leading-none cursor-pointer select-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--theme-elevation-800)",
              active
                ? "border-(--theme-elevation-800) bg-(--theme-elevation-800) text-(--theme-elevation-0)"
                : "border-(--theme-elevation-150) bg-(--theme-elevation-0) text-(--theme-elevation-800) hover:border-(--theme-elevation-250)"
            )}
          >
            {active && <CheckIcon width={12} height={12} aria-hidden="true" />}
            {label}
            {count !== null && count > 0 && (
              <span
                className={cn(
                  "tabular-nums",
                  active ? "opacity-70" : "text-(--theme-elevation-500)"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
