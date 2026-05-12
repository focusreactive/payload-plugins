"use client";

import dynamic from "next/dynamic";
import { SkeletonBlock } from "./SkeletonBlock";
import { ErrorTile } from "./ErrorTile";
import { EmptyTile } from "./EmptyTile";
import type { LucideIcon } from "lucide-react";
import type { BlockStateProps } from "../types/blockState";

const DonutInner = dynamic(() => import("./DonutChartInner").then((m) => m.DonutChartInner), {
  ssr: false,
  loading: () => <SkeletonBlock shape="chart" />,
});

export interface DonutSlice {
  label: string;
  value: number;
  icon?: LucideIcon;
}

export interface DonutChartProps extends BlockStateProps {
  data: DonutSlice[];
  centerCaption?: string;
}

export function DonutChart(props: DonutChartProps) {
  if (props.loading) return <SkeletonBlock shape="chart" />;
  if (props.error) return <ErrorTile error={props.error} onRetry={props.onRetry} />;
  if (props.data.length === 0) return <EmptyTile message="No data in this range." />;

  return <DonutInner data={props.data} centerCaption={props.centerCaption ?? "SESSIONS"} />;
}
