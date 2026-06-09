"use client";

import type { CheckResult } from "../../../engine/types/analysis";
import { resolveVisualization } from "./resolveVisualization";
import { DensityGauge } from "./visualizations/DensityGauge";
import { SegmentBar } from "./visualizations/SegmentBar";
import { DrillDown } from "./visualizations/DrillDown";
import { DistributionBar } from "./visualizations/DistributionBar";

export function CheckVisualization({ check }: { check: CheckResult }) {
  const visualization = resolveVisualization(check);

  switch (visualization.type) {
    case "value-range":
      return <DensityGauge {...visualization.props} />;
    case "proportion":
      return <SegmentBar {...visualization.props} />;
    case "count-drilldown":
      return <DrillDown {...visualization.props} />;
    case "distribution":
      return <DistributionBar {...visualization.props} />;
    case "presence":
      return null;
  }
}
