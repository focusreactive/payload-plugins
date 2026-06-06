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
    <div className="sumA">
      <ScoreRing score={data.ringScore} status={data.status} />

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <b style={{ fontSize: 14 }}>{title}</b>
          <StatusPill status={data.status}>{LABEL[data.status]}</StatusPill>
        </div>

        <div className="seo-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
          {passing} / {data.checks.length} checks passing
        </div>
      </div>
    </div>
  );
}
