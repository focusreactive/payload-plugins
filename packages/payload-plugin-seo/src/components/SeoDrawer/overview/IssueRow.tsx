"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import type { CheckResult } from "../../../engine/types/analysis";
import { ALL_CHECK_IDS } from "../../../constants/checkIds";
import type { CheckId } from "../../../constants/checkIds";
import { CheckVisualization } from "../../../ui/CheckRow/CheckVisualization";
import { useSeoTranslation } from "../../../translations/useSeoTranslation";
import { cn } from "../../../utils/style";
import type { Issue } from "./buildIssues";
import { MiniGauge } from "./MiniGauge";
import { StatusMark } from "./StatusMark";

const CATEGORY_LABEL = {
  keyphrase: "tab.keyphrase",
  onpage: "tab.onpage",
  readability: "tab.readability",
  inclusive: "tab.inclusive",
} as const;

const VALUE_COLOR = {
  bad: cn("text-seo-bad"),
  warn: cn("text-seo-warn"),
  good: cn("text-neutral-800"),
};

function hasDetails(check: CheckResult) {
  const type = check.viz?.type;
  return type === "count-drilldown" || type === "distribution";
}

function Measure({ check }: { check: CheckResult }) {
  const { t } = useSeoTranslation();
  const viz = check.viz;

  if (viz?.type === "value-range") {
    const target = viz.gauge.labels.find((label) => label.emphasis === "good")?.text;
    return (
      <span className="flex items-center gap-[12px]">
        <span className="flex flex-col items-end leading-[1.25]">
          <span className={cn("text-[13px] font-semibold tabular-nums", VALUE_COLOR[check.status])}>
            {viz.gauge.markerLabel}
          </span>
          {target && (
            <span className="text-[11px] text-neutral-500 tabular-nums whitespace-nowrap">
              {t("overview.target", { range: target })}
            </span>
          )}
        </span>
        <MiniGauge gauge={viz.gauge} />
      </span>
    );
  }

  if (
    viz?.type === "proportion" &&
    viz.segment.countLabel &&
    !viz.segment.countLabel.startsWith("0 / 0")
  ) {
    return (
      <span className={cn("text-[13px] font-semibold tabular-nums", VALUE_COLOR[check.status])}>
        {viz.segment.countLabel}
      </span>
    );
  }

  return null;
}

interface IssueRowProps {
  issue: Issue;
  compact?: boolean;
  showCategory?: boolean;
}

export function IssueRow({ issue, compact = false, showCategory = true }: IssueRowProps) {
  const { t } = useSeoTranslation();
  const [open, setOpen] = useState(false);
  const detailsId = useId();

  if (issue.kind === "inclusive") {
    return (
      <li className="flex items-start gap-[12px] px-[16px] py-[12px]">
        <span className="pt-[2px]">
          <StatusMark status={issue.status} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13.5px] font-medium text-neutral-800 leading-[1.4]">
            {t("overview.inclusive.headline", { term: issue.flag.term })}
          </span>
          <span className="block mt-[2px] text-[12px] text-neutral-500">
            {t("overview.inclusive.suggestion", { suggestion: issue.flag.suggestion })} ·{" "}
            {t(`inclusive.category.${issue.inclusiveCategory}`)}
          </span>
        </span>
        <span className="text-[12px] text-neutral-500 whitespace-nowrap pt-[2px]">
          {issue.flag.location}
        </span>
      </li>
    );
  }

  const { check } = issue;
  const known = ALL_CHECK_IDS.has(check.id as CheckId);
  const name = known ? t(`check.${check.id as CheckId}.name`) : check.id;
  const tip = known ? t(`check.${check.id as CheckId}.tip`) : "";
  const advice =
    check.recommendation && !check.recommendation.key.startsWith("reco.generic")
      ? t(check.recommendation.key, check.recommendation.vars)
      : null;
  const expandable = hasDetails(check);

  if (compact) {
    return (
      <li className="flex items-center gap-[10px] px-[16px] py-[8px] text-[13px] text-neutral-700">
        <StatusMark status={check.status} />
        <span className="flex-1 min-w-0 truncate">{name}</span>
        {showCategory && (
          <span className="text-[12px] text-neutral-500">{t(CATEGORY_LABEL[issue.category])}</span>
        )}
      </li>
    );
  }

  const body = (
    <>
      <span className="pt-[2px]">
        <StatusMark status={check.status} />
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-[13.5px] font-medium text-neutral-800 leading-[1.4]">
          {advice ?? name}
        </span>
        <span className="block mt-[2px] text-[12px] leading-[1.45] text-neutral-500">
          {[advice ? name : tip, showCategory ? t(CATEGORY_LABEL[issue.category]) : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <Measure check={check} />
      {expandable && (
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn(
            "flex-none mt-[2px] text-neutral-500 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      )}
    </>
  );

  return (
    <li>
      {expandable ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          aria-label={t("overview.showDetails", { name })}
          onClick={() => setOpen((value) => !value)}
          className="w-full flex items-start gap-[12px] px-[16px] py-[12px] border-0 bg-transparent font-[inherit] cursor-pointer hover:bg-neutral-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-800"
        >
          {body}
        </button>
      ) : (
        <div className="flex items-start gap-[12px] px-[16px] py-[12px]">{body}</div>
      )}
      {expandable && open && (
        <div id={detailsId} className="px-[16px] pb-[14px] pl-[44px]">
          <CheckVisualization check={check} />
        </div>
      )}
    </li>
  );
}
