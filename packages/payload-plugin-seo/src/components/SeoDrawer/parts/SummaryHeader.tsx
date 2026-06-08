"use client";
import { ScoreRing } from "./ScoreRing";
import { StatusPill } from "./StatusPill";
import type { CategoryResult, Status } from "../../../engine/types";

const LABEL: Record<Status, string> = {
  good: "Good",
  warn: "Needs work",
  bad: "Problem",
};

interface SummaryHeaderProps {
  title: string;
  data: CategoryResult;
}

export function SummaryHeader({ title, data }: SummaryHeaderProps) {
  const passing = data.checks.filter((c) => c.status === "good").length;

  return (
    <div className="bg-neutral-0 border border-neutral-200 rounded-rm p-[14px] flex items-center gap-[15px]">
      <ScoreRing score={data.ringScore} status={data.status} />

      <div className="flex-1">
        <div className="flex items-center gap-[8px]">
          <b className="text-[14px]">{title}</b>
          <StatusPill status={data.status}>{LABEL[data.status]}</StatusPill>
        </div>

        <div className="text-neutral-500 text-[11.5px] mt-[4px]">
          {passing} / {data.checks.length} checks passing
        </div>
      </div>
    </div>
  );
}
