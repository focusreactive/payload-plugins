"use client";

import type { Status } from "../../../engine/types/analysis";
import { useSeoTranslation } from "../../../translations/useSeoTranslation";
import { cn } from "../../../utils/style";
import { statusVar } from "../variants";
import type { CategorySummary, IssueCategory } from "./buildIssues";

const CATEGORY_LABEL = {
  keyphrase: "tab.keyphrase",
  onpage: "tab.onpage",
  readability: "tab.readability",
  inclusive: "tab.inclusive",
} as const;

const SCORE_COLOR: Record<Status, string> = {
  bad: cn("text-seo-bad"),
  warn: cn("text-seo-warn"),
  good: cn("text-seo-good"),
};

interface ScoreSummaryProps {
  score: number;
  status: Status;
  problems: number;
  improvements: number;
  categories: CategorySummary[];
  selected: IssueCategory | null;
  onSelect: (category: IssueCategory | null) => void;
}

export function ScoreSummary({
  score,
  status,
  problems,
  improvements,
  categories,
  selected,
  onSelect,
}: ScoreSummaryProps) {
  const { t } = useSeoTranslation();
  const problemsText = t("overview.problems", { count: problems });
  const improvementsText = t("overview.improvements", { count: improvements });

  let verdict = t("overview.verdict.good");
  if (problems > 0 && improvements > 0) {
    verdict = t("overview.verdict.issues", {
      problems: problemsText,
      improvements: improvementsText,
    });
  } else if (problems > 0) {
    verdict = t("overview.verdict.onlyProblems", { problems: problemsText });
  } else if (improvements > 0) {
    verdict = t("overview.verdict.onlyImprovements", { improvements: improvementsText });
  }

  return (
    <section className="grid grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-[28px] rounded-rm border border-neutral-150 bg-neutral-0 p-[20px] max-[900px]:grid-cols-1">
      <div className="flex flex-col justify-center gap-[6px]">
        <span className="text-[12px] text-neutral-500">{t("overview.score")}</span>
        <span className="flex items-baseline gap-[4px]">
          <span
            className={cn(
              "text-[44px] leading-none font-semibold tabular-nums",
              SCORE_COLOR[status]
            )}
          >
            {score}
          </span>
          <span className="text-[14px] text-neutral-500">/ 100</span>
        </span>
        <span className="text-[14px] leading-[1.4] text-neutral-800">{verdict}</span>
      </div>

      <div className="flex flex-col gap-[2px]" role="group" aria-label={t("overview.toFix")}>
        {categories.map((category) => {
          const active = selected === category.category;

          return (
            <button
              key={category.category}
              type="button"
              aria-pressed={active}
              disabled={!category.available}
              onClick={() => onSelect(active ? null : category.category)}
              className={cn(
                "grid grid-cols-[120px_minmax(0,1fr)_32px_76px] items-center gap-[12px] px-[10px] py-[7px] rounded-rs border border-solid border-transparent bg-transparent font-[inherit] text-left cursor-pointer",
                "hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-neutral-800 disabled:cursor-default disabled:hover:bg-transparent",
                active && "bg-neutral-50 border-neutral-200"
              )}
            >
              <span className="text-[13px] text-neutral-800 truncate">
                {t(CATEGORY_LABEL[category.category])}
              </span>
              <span className="h-[6px] rounded-full bg-neutral-100 overflow-hidden">
                {category.available && (
                  <span
                    className={cn(
                      "block h-full rounded-full bg-(--seo-c)",
                      statusVar({ status: category.status })
                    )}
                    style={{ width: `${Math.max(2, category.score)}%` }}
                  />
                )}
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-right text-neutral-800">
                {category.available ? category.score : "—"}
              </span>
              <span className="text-[12px] text-neutral-500 text-right whitespace-nowrap">
                {category.open > 0 ? t("overview.toFixCount", { count: category.open }) : ""}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
