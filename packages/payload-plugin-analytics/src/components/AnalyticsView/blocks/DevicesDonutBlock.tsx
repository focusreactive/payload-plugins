"use client";

import { MonitorSmartphone } from "lucide-react";
import { useTopDevicesQuery } from "../hooks/queries/useTopDevicesQuery";
import { DataCard } from "../ui/DataCard";
import { DonutChart } from "../ui/DonutChart";
import { getDeviceIcon } from "../icons";
import type { DeviceCategory, TopDevicesResponse } from "../../../types/query";
import type { BlockComponentProps } from "../../../types/layout";

const LIMIT = 10;

function aggregateByDevice(rows: TopDevicesResponse["rows"]) {
  const acc = new Map<DeviceCategory, number>();
  for (const r of rows) acc.set(r.deviceCategory, (acc.get(r.deviceCategory) ?? 0) + r.sessions);
  return [...acc.entries()].map(([deviceCategory, sessions]) => ({ deviceCategory, sessions }));
}

export function DevicesDonutBlock({ dateRange, comparison, className }: BlockComponentProps) {
  const { data, isLoading, error } = useTopDevicesQuery({ dateRange, comparison, limit: LIMIT });
  const showCompare = comparison.kind === "previous-period";
  const prev = new Map(aggregateByDevice(data?.comparison?.rows ?? []).map((d) => [d.deviceCategory, d.sessions]));

  return (
    <DataCard title="Devices" icon={MonitorSmartphone} className={className}>
      <DonutChart
        data={aggregateByDevice(data?.rows ?? []).map((d) => ({
          label: d.deviceCategory.charAt(0).toUpperCase() + d.deviceCategory.slice(1),
          value: d.sessions,
          icon: getDeviceIcon(d.deviceCategory),
          prev: showCompare ? (prev.get(d.deviceCategory) ?? undefined) : undefined,
        }))}
        loading={isLoading}
        error={error ?? undefined}
      />
    </DataCard>
  );
}
