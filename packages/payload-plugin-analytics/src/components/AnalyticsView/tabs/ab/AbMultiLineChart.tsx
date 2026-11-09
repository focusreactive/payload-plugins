"use client";

import dynamic from "next/dynamic";
import { SkeletonBlock } from "../../ui/SkeletonBlock";

export const AbMultiLineChart = dynamic(
  async () => (await import("./AbMultiLineChartInner")).AbMultiLineChartInner,
  {
    ssr: false,
    loading: () => <SkeletonBlock shape="chart" />,
  }
);
