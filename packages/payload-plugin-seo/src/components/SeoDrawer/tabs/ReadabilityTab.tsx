"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import type { CategoryResult, CheckResult } from "../../../engine/types";
import { SummaryHeader } from "../parts/SummaryHeader";
import { FilterPills } from "../parts/FilterPills";
import type { Filter } from "../parts/FilterPills";
import { CheckRow } from "../parts/CheckRow";
import { SegmentBar } from "../parts/SegmentBar";
import { DensityGauge } from "../parts/DensityGauge";
import { DrillDown } from "../parts/DrillDown";

function pill(c: CheckResult): ReactNode {
  return c.status === "good" ? "Good" : c.status === "bad" ? "Problem" : "Needs work";
}
function viz(c: CheckResult): ReactNode {
  const d = (c.data ?? {}) as Record<string, number>;
  if (c.id === "fleschReadingEase" && d.score != null) {
    return <SegmentBar countLabel={`${d.score} / 100`} filledPct={d.score} filledColor={`var(--seo-${c.status})`} />;
  }
  if (c.id === "textParagraphTooLong" && Array.isArray((c.data as { paragraphs?: { left: string; right: string }[] })?.paragraphs)) {
    const ps = (c.data as { paragraphs: { left: string; right: string }[] }).paragraphs;
    return <DrillDown label={`Show ${ps.length} paragraphs`} items={ps} />;
  }
  if ((c.id === "textTransitionWords" || c.id === "textSentenceLength") && d.pct != null) {
    return (
      <DensityGauge
        bands={[
          { width: 60, color: "var(--seo-good)" },
          { width: 15, color: "var(--seo-warn)" },
          { width: 25, color: "var(--seo-bad)" },
        ]}
        markerPct={Math.min(100, d.pct)}
        markerLabel={`${d.pct}%`}
        markerColor={`var(--seo-${c.status})`}
        scale={["0%", "", "50%+"]}
      />
    );
  }
  return null;
}

export function ReadabilityTab({ data }: { data: CategoryResult }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = data.checks.filter((c) => filter === "all" || c.status === filter);

  return (
    <section className="panel on">
      <SummaryHeader title="Readability" data={data} />

      <div className="section">
        <div className="sec-head">
          <span className="ttl">Checks</span>
          <span className="cnt">{data.checks.length}</span>
        </div>

        <FilterPills checks={data.checks} value={filter} onChange={setFilter} />

        {visible.map((c) => (
          <CheckRow key={c.id} check={c} pillLabel={pill(c)}>
            {viz(c)}
          </CheckRow>
        ))}
      </div>
    </section>
  );
}
