"use client";

import { ChevronRight } from "lucide-react";
import { useId, useState } from "react";
import { useSeoTranslation } from "../../../translations/useSeoTranslation";
import { cn } from "../../../utils/style";
import type { Issue } from "./buildIssues";
import { IssueRow } from "./IssueRow";
import { StatusMark } from "./StatusMark";

interface IssueListProps {
  open: Issue[];
  passed: Issue[];
  showCategory?: boolean;
}

const LIST = cn("m-0 p-0 list-none divide-y divide-neutral-150");

export function IssueList({ open, passed, showCategory = true }: IssueListProps) {
  const { t } = useSeoTranslation();
  const [showPassed, setShowPassed] = useState(false);
  const passedId = useId();

  return (
    <div className="rounded-rm border border-neutral-150 bg-neutral-0 overflow-hidden">
      {open.length > 0 ? (
        <ul className={LIST}>
          {open.map((issue) => (
            <IssueRow key={issue.key} issue={issue} showCategory={showCategory} />
          ))}
        </ul>
      ) : (
        <p className="m-0 flex items-center gap-[10px] px-[16px] py-[14px] text-[13.5px] text-neutral-800">
          <StatusMark status="good" />
          {t("overview.allClear")}
        </p>
      )}

      {passed.length > 0 && (
        <div className="border-t border-neutral-150">
          <button
            type="button"
            aria-expanded={showPassed}
            aria-controls={passedId}
            onClick={() => setShowPassed((value) => !value)}
            className="w-full flex items-center gap-[8px] px-[16px] py-[10px] border-0 bg-neutral-50 text-[12.5px] font-medium text-neutral-600 font-[inherit] text-left cursor-pointer hover:text-neutral-800 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-800"
          >
            <ChevronRight
              size={14}
              aria-hidden="true"
              className={cn("transition-transform duration-150", showPassed && "rotate-90")}
            />
            {t("overview.passed", { count: passed.length })}
          </button>
          {showPassed && (
            <ul id={passedId} className={cn(LIST, "bg-neutral-50 pb-[4px]")}>
              {passed.map((issue) => (
                <IssueRow key={issue.key} issue={issue} compact showCategory={showCategory} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
