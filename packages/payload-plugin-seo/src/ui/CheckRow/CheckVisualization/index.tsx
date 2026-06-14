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
    case "value-range":
      return <DensityGauge {...viz.gauge} />;
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
