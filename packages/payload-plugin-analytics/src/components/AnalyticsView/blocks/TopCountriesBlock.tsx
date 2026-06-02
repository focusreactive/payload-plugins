"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { useTopCountriesQuery } from "../hooks/queries/useTopCountriesQuery";
import { DataCard } from "../ui/DataCard";
import { BarList } from "../ui/BarList";
import { MetricSwitcher } from "../ui/MetricSwitcher";
import { formatNumber } from "../numberFormatters";
import type { TopCountriesDimension } from "../../../types/query";
import type { BlockComponentProps } from "../../../types/layout";

const LIMIT = 10;

export function TopCountriesBlock({ dateRange, comparison, className }: BlockComponentProps) {
  const [mode, setMode] = useState<TopCountriesDimension>("country");
  const { data, isLoading, error } = useTopCountriesQuery({
    dateRange,
    comparison,
    limit: LIMIT,
    dimension: mode,
  });
  const showCompare = comparison.kind === "previous-period";
  const prev = new Map((data?.comparison?.rows ?? []).map((r) => [mode === "city" ? r.city : r.country, r]));

  return (
    <DataCard
      title={mode === "city" ? "Top cities" : "Top countries"}
      icon={MapPin}
      className={className}
      action={
        <MetricSwitcher<TopCountriesDimension>
          value={mode}
          onChange={setMode}
          options={[
            { value: "country", label: "Country" },
            { value: "city", label: "City" },
          ]}
        />
      }
    >
      <BarList
        rows={(data?.rows ?? []).map(({ city, country, sessions }) => {
          const key = mode === "city" ? city : country;
          const prevRow = prev.get(key);
          return mode === "city"
            ? {
                label: city,
                sub: country || undefined,
                value: sessions,
                prev: showCompare ? (prevRow?.sessions ?? undefined) : undefined,
              }
            : { label: country, value: sessions, prev: showCompare ? (prevRow?.sessions ?? undefined) : undefined };
        })}
        initialVisible={6}
        loading={isLoading}
        error={error ?? undefined}
        format={formatNumber}
      />
    </DataCard>
  );
}
