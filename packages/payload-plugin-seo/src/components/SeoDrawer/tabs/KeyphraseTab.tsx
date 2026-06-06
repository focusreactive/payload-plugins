"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import type { CategoryResult, CheckResult } from "../../../engine/types";
import { SummaryHeader } from "../parts/SummaryHeader";
import { FilterPills } from "../parts/FilterPills";
import type { Filter } from "../parts/FilterPills";
import { CheckRow } from "../parts/CheckRow";
import { DensityGauge } from "../parts/DensityGauge";
import { SegmentBar } from "../parts/SegmentBar";
import { DistributionBar } from "../parts/DistributionBar";

function pill(c: CheckResult): ReactNode {
  if (c.status === "good") return "Good";
  if (c.status === "bad") return "Not found";
  return "Needs work";
}

function viz(c: CheckResult): ReactNode {
  const d = (c.data ?? {}) as Record<string, number>;

  if (c.id === "keyphraseDensity" && d.densityPct != null) {
    return (
      <DensityGauge
        bands={[
          { width: 8, color: "var(--seo-bad)" },
          { width: 5, color: "var(--seo-warn)" },
          { width: 54, color: "var(--seo-good)" },
          { width: 5, color: "var(--seo-warn)" },
          { width: 28, color: "var(--seo-bad)" },
        ]}
        markerPct={Math.min(100, (d.densityPct / 4) * 100)}
        markerLabel={`${d.densityPct.toFixed(1)}%`}
        markerColor={`var(--seo-${c.status})`}
        scale={["0%", "ideal 0.5–2.5%", "4%"]}
      />
    );
  }
  if (c.id === "imageKeyphrase" && d.total != null) {
    return <SegmentBar countLabel={`${d.matched ?? 0} / ${d.total}`} filledPct={d.total ? ((d.matched ?? 0) / d.total) * 100 : 0} filledColor="var(--seo-warn)" />;
  }
  if (c.id === "keyphraseDistribution" && Array.isArray((c.data as { positions?: number[] })?.positions)) {
    return <DistributionBar positions={(c.data as { positions: number[] }).positions} />;
  }
  return null;
}

export function KeyphraseTab({ data }: { data: CategoryResult }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = data.checks.filter((c) => filter === "all" || c.status === filter);

  return (
    <section className="panel on">
      <SummaryHeader title="Keyphrase optimization" data={data} />

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
