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

function pill(c: CheckResult): ReactNode {
  const d = (c.data ?? {}) as Record<string, number | string>;
  if (c.id === "textLength" && d.words != null) return `${d.words} words`;
  if (c.id === "titleWidth" && d.px != null) return `${d.px} px`;
  if (c.id === "externalLinks" && d.total != null) return `${d.total} links`;
  return c.status === "good" ? "Good" : c.status === "bad" ? "Problem" : "Needs work";
}

function viz(c: CheckResult): ReactNode {
  const d = (c.data ?? {}) as Record<string, number>;
  if (c.id === "metaDescriptionLength" && d.chars != null) {
    return (
      <DensityGauge
        bands={[
          { width: 20, color: "var(--seo-bad)" },
          { width: 8, color: "var(--seo-warn)" },
          { width: 55, color: "var(--seo-good)" },
          { width: 7, color: "var(--seo-warn)" },
          { width: 10, color: "var(--seo-bad)" },
        ]}
        markerPct={Math.min(100, (d.chars / 180) * 100)}
        markerLabel={`${d.chars}`}
        markerColor={`var(--seo-${c.status})`}
        scale={["0", "120–158 chars", "180"]}
      />
    );
  }
  if (c.id === "titleWidth" && d.px != null) {
    return (
      <DensityGauge
        bands={[
          { width: 18, color: "var(--seo-bad)" },
          { width: 8, color: "var(--seo-warn)" },
          { width: 61, color: "var(--seo-good)" },
          { width: 4, color: "var(--seo-warn)" },
          { width: 9, color: "var(--seo-bad)" },
        ]}
        markerPct={Math.min(100, (d.px / 600) * 100)}
        markerLabel={`${d.px}px`}
        markerColor={`var(--seo-${c.status})`}
        scale={["0", "fits ≤ 580px", "600"]}
      />
    );
  }
  if ((c.id === "externalLinks" || c.id === "internalLinks") && d.total != null) {
    const follow = d.follow ?? 0;
    return (
      <SegmentBar
        countLabel={`${follow} / ${d.total}`}
        filledPct={d.total ? (follow / d.total) * 100 : 0}
        filledColor={c.status === "good" ? "var(--seo-good)" : "var(--seo-warn)"}
        legend={[
          { color: "var(--seo-good)", label: `${follow} dofollow` },
          { color: "var(--seo-e300)", label: `${d.total - follow} nofollow` },
        ]}
      />
    );
  }
  return null;
}

export function OnPageTab({ data }: { data: CategoryResult }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = data.checks.filter((c) => filter === "all" || c.status === filter);

  return (
    <section className="panel on">
      <SummaryHeader title="On-page structure" data={data} />

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
