"use client";

import { Users } from "lucide-react";
import { useKpisQuery } from "../hooks/queries/useKpisQuery";
import { KpiCard } from "../ui/KpiCard";
import { formatNumber } from "../numberFormatters";
import type { BlockComponentProps } from "../../../types/layout";

export function UsersKpiBlock({ dateRange, comparison, className }: BlockComponentProps) {
  const { data, isLoading, isPlaceholderData, error } = useKpisQuery({ dateRange, comparison });
  const showCompare = comparison.kind === "previous-period";

  return (
    <KpiCard
      label="Users"
      icon={Users}
      value={data?.current.users ?? 0}
      format={formatNumber}
      prevValue={showCompare ? (data?.comparison?.users ?? null) : null}
      loading={isLoading}
      refreshing={isPlaceholderData}
      error={error ?? undefined}
      className={className}
    />
  );
}
