"use client";

import type { CheckResult } from "../../../engine/types/analysis";
import { DensityGauge } from "./visualizations/DensityGauge";
import { SegmentBar } from "./visualizations/SegmentBar";
import { DrillDown } from "./visualizations/DrillDown";
import { DistributionBar } from "./visualizations/DistributionBar";

export function CheckVisualization({ check }: { check: CheckResult }) {
  const viz = check.viz;
  if (!viz) return null;

  switch (viz.type) {
    case "value-range": {
      const g = viz.gauge;
      return (
        <DensityGauge
          bands={g.bands.map((b) => ({
            width: b.endPct - b.startPct,
            status: b.status,
          }))}
          markerPct={g.markerPct}
          markerLabel={g.markerLabel}
          markerStatus={g.markerStatus}
          scale={[g.labels[0]?.text ?? "", g.labels.find((l) => l.emphasis === "good")?.text ?? "", g.labels[g.labels.length - 1]?.text ?? ""]}
        />
      );
    }
    case "proportion":
      return <SegmentBar {...viz.segment} />;
    case "count-drilldown":
      return <DrillDown {...viz.drilldown} />;
    case "distribution":
      return <DistributionBar {...viz.distribution} />;
    case "presence":
      return null;
  }
}
