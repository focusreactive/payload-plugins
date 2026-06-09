import type { DensityGaugeProps } from "./visualizations/DensityGauge";
import type { SegmentBarProps } from "./visualizations/SegmentBar";
import type { DrillDownProps } from "./visualizations/DrillDown";
import type { DistributionBarProps } from "./visualizations/DistributionBar";

export type Visualization =
  | { type: "presence" }
  | { type: "value-range"; props: DensityGaugeProps }
  | { type: "proportion"; props: SegmentBarProps }
  | { type: "count-drilldown"; props: DrillDownProps }
  | { type: "distribution"; props: DistributionBarProps };
