"use client";

import { useMemo, useState } from "react";
import { OverviewTabView, type CountriesMode } from "./OverviewTabView";
import { useKpisQuery } from "../hooks/queries/useKpisQuery";
import { useTopPagesQuery } from "../hooks/queries/useTopPagesQuery";
import { useTopSourcesQuery } from "../hooks/queries/useTopSourcesQuery";
import { useTopEventsQuery } from "../hooks/queries/useTopEventsQuery";
import { useTopDevicesQuery } from "../hooks/queries/useTopDevicesQuery";
import { useTopCountriesQuery } from "../hooks/queries/useTopCountriesQuery";
import type { Comparison, DateRange } from "../../../types/query";

const TOP_N_LIMIT = 10;

export interface OverviewTabProps {
  dateRange: DateRange;
  comparison: Comparison;
}

export function OverviewTab({ dateRange, comparison }: OverviewTabProps) {
  const [countriesMode, setCountriesMode] = useState<CountriesMode>("country");

  const base = useMemo(() => ({ dateRange, comparison }), [dateRange, comparison]);
  const topNQuery = useMemo(() => ({ ...base, limit: TOP_N_LIMIT }), [base]);
  const topCountriesQuery = useMemo(() => ({ ...topNQuery, dimension: countriesMode }), [topNQuery, countriesMode]);

  const kpis = useKpisQuery(base);
  const topPages = useTopPagesQuery(topNQuery);
  const topSources = useTopSourcesQuery(topNQuery);
  const topEvents = useTopEventsQuery(topNQuery);
  const topDevices = useTopDevicesQuery(topNQuery);
  const topCountries = useTopCountriesQuery(topCountriesQuery);

  return (
    <OverviewTabView
      comparison={comparison}
      kpis={kpis.data}
      topPages={topPages.data}
      topSources={topSources.data}
      topEvents={topEvents.data}
      topDevices={topDevices.data}
      topCountries={topCountries.data}
      countriesMode={countriesMode}
      onCountriesModeChange={setCountriesMode}
      loading={{
        kpis: kpis.isLoading,
        topPages: topPages.isLoading,
        topSources: topSources.isLoading,
        topEvents: topEvents.isLoading,
        topDevices: topDevices.isLoading,
        topCountries: topCountries.isLoading,
      }}
      errors={{
        kpis: kpis.error ?? undefined,
        topPages: topPages.error ?? undefined,
        topSources: topSources.error ?? undefined,
        topEvents: topEvents.error ?? undefined,
        topDevices: topDevices.error ?? undefined,
        topCountries: topCountries.error ?? undefined,
      }}
    />
  );
}
