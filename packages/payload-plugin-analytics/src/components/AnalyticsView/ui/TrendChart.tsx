"use client";

import dynamic from "next/dynamic";
import type { KpiSeriesPoint } from "../../../types/query";
import { SkeletonBlock } from "./SkeletonBlock";
import { ErrorTile } from "./ErrorTile";
import { EmptyTile } from "./EmptyTile";
import type { BlockStateProps } from "../types/blockState";

const TrendChartInner = dynamic(async () => (await import("./TrendChartInner")).TrendChartInner, {
  ssr: false,
  loading: () => <SkeletonBlock shape="chart" />,
});

export type TrendMetric = "sessions" | "users" | "pageViews" | "bounceRate" | "avgSessionDuration";

export interface TrendChartProps extends BlockStateProps {
  series: KpiSeriesPoint[];
  comparisonSeries?: KpiSeriesPoint[];
  metric: TrendMetric;
}

export function TrendChart(props: TrendChartProps) {
  if (props.loading) return <SkeletonBlock shape="chart" />;
  if (props.error) return <ErrorTile error={props.error} onRetry={props.onRetry} />;
  if (props.series.length === 0) return <EmptyTile message="No data in this range." />;

  return <TrendChartInner series={props.series} comparisonSeries={props.comparisonSeries} metric={props.metric} />;
}
