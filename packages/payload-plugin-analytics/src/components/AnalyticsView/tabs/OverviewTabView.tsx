"use client";

import { useState } from "react";
import {
  Activity,
  Users,
  Eye,
  ArrowDown,
  Clock,
  TrendingUp,
  FileText,
  Globe,
  Sparkles,
  MonitorSmartphone,
  MapPin,
} from "lucide-react";
import { DataCard } from "../ui/DataCard";
import { KpiCard } from "../ui/KpiCard";
import { TopNTable } from "../ui/TopNTable";
import { TrendChart, type TrendMetric } from "../ui/TrendChart";
import { MetricSwitcher } from "../ui/MetricSwitcher";
import { DonutChart } from "../ui/DonutChart";
import { BarList } from "../ui/BarList";
import { getDeviceIcon } from "../icons";
import { formatDuration, formatNumber, formatPercentage } from "../numberFormatters";
import type {
  Comparison,
  DeviceCategory,
  KpiResponse,
  TopCountriesResponse,
  TopDevicesResponse,
  TopEventsResponse,
  TopEventsRow,
  TopPagesResponse,
  TopPagesRow,
  TopSourcesResponse,
  TopSourcesRow,
} from "../../../types/query";

export type CountriesMode = "country" | "city";

export interface OverviewTabViewProps {
  comparison: Comparison;
  kpis?: KpiResponse;
  topPages?: TopPagesResponse;
  topSources?: TopSourcesResponse;
  topEvents?: TopEventsResponse;
  topDevices?: TopDevicesResponse;
  topCountries?: TopCountriesResponse;
  countriesMode?: CountriesMode;
  onCountriesModeChange?: (mode: CountriesMode) => void;
  loading?: Partial<Record<"kpis" | "topPages" | "topSources" | "topEvents" | "topDevices" | "topCountries", boolean>>;
  errors?: Partial<Record<"kpis" | "topPages" | "topSources" | "topEvents" | "topDevices" | "topCountries", Error>>;
}

function aggregateByDevice(
  rows: TopDevicesResponse["rows"],
): Array<{ deviceCategory: DeviceCategory; sessions: number }> {
  const acc = new Map<DeviceCategory, number>();

  for (const r of rows) acc.set(r.deviceCategory, (acc.get(r.deviceCategory) ?? 0) + r.sessions);

  return [...acc.entries()].map(([deviceCategory, sessions]) => ({ deviceCategory, sessions }));
}

export function OverviewTabView({
  comparison,
  kpis,
  topPages,
  topSources,
  topEvents,
  topDevices,
  topCountries,
  countriesMode = "country",
  onCountriesModeChange,
  loading,
  errors,
}: OverviewTabViewProps) {
  const [metric, setMetric] = useState<TrendMetric>("sessions");
  const showCompare = comparison.kind === "previous-period";
  const cur = kpis?.current;
  const prev = kpis?.comparison;

  const prevTopPages = new Map((topPages?.comparison?.rows ?? []).map((r) => [r.pagePath, r]));
  const prevTopSources = new Map((topSources?.comparison?.rows ?? []).map((r) => [`${r.source}|${r.medium}`, r]));
  const prevTopEvents = new Map((topEvents?.comparison?.rows ?? []).map((r) => [r.eventName, r]));
  const prevTopCountries = new Map(
    (topCountries?.comparison?.rows ?? []).map((r) => [countriesMode === "city" ? r.city : r.country, r]),
  );
  const prevDeviceSessions = new Map(
    aggregateByDevice(topDevices?.comparison?.rows ?? []).map((d) => [d.deviceCategory, d.sessions]),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-5 gap-4">
        <KpiCard
          label="Sessions"
          icon={Activity}
          value={cur?.sessions ?? 0}
          format={formatNumber}
          prevValue={showCompare ? (prev?.sessions ?? null) : null}
          loading={loading?.kpis}
          error={errors?.kpis}
        />

        <KpiCard
          label="Users"
          icon={Users}
          value={cur?.users ?? 0}
          format={formatNumber}
          prevValue={showCompare ? (prev?.users ?? null) : null}
          loading={loading?.kpis}
          error={errors?.kpis}
        />

        <KpiCard
          label="Pageviews"
          icon={Eye}
          value={cur?.pageViews ?? 0}
          format={formatNumber}
          prevValue={showCompare ? (prev?.pageViews ?? null) : null}
          loading={loading?.kpis}
          error={errors?.kpis}
        />

        <KpiCard
          label="Bounce rate"
          icon={ArrowDown}
          value={cur?.bounceRate ?? 0}
          format={formatPercentage}
          invertDelta
          prevValue={showCompare ? (prev?.bounceRate ?? null) : null}
          loading={loading?.kpis}
          error={errors?.kpis}
        />

        <KpiCard
          label="Avg duration"
          icon={Clock}
          value={cur?.avgSessionDuration ?? 0}
          format={formatDuration}
          prevValue={showCompare ? (prev?.avgSessionDuration ?? null) : null}
          loading={loading?.kpis}
          error={errors?.kpis}
        />
      </div>

      <DataCard
        title="Trend"
        icon={TrendingUp}
        action={
          <MetricSwitcher
            value={metric}
            onChange={setMetric}
            options={[
              { value: "sessions", label: "Sessions" },
              { value: "users", label: "Users" },
              { value: "pageViews", label: "Pageviews" },
              { value: "bounceRate", label: "Bounce rate" },
              { value: "avgSessionDuration", label: "Average duration" },
            ]}
          />
        }>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex gap-3.5 text-[11px] text-[var(--theme-elevation-500)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-0 border-t-2 border-[var(--theme-elevation-800)]" /> Current
            </span>

            {showCompare && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-0 border-t-2 border-dashed border-[var(--theme-elevation-500)]" /> Previous
                period
              </span>
            )}
          </div>
        </div>

        <TrendChart
          series={kpis?.series ?? []}
          comparisonSeries={showCompare ? kpis?.comparisonSeries : undefined}
          metric={metric}
          loading={loading?.kpis}
          error={errors?.kpis}
        />
      </DataCard>

      <div className="grid grid-cols-3 gap-4">
        <DataCard title="Top pages" icon={FileText}>
          <TopNTable<TopPagesRow>
            rows={topPages?.rows ?? []}
            loading={loading?.topPages}
            error={errors?.topPages}
            columns={[
              {
                key: "pagePath",
                header: "Page",
                render: (r) => (
                  <div className="flex flex-col min-w-0">
                    <span className="font-[family-name:var(--font-mono)] truncate text-xs" title={r.pagePath}>
                      {r.pagePath}
                    </span>
                    <span className="text-[var(--theme-elevation-500)] text-[11px] truncate">{r.pageTitle}</span>
                  </div>
                ),
              },
              {
                key: "pageViews",
                header: "Views",
                align: "right",
                value: (r) => r.pageViews,
                prevValue: showCompare ? (r) => prevTopPages.get(r.pagePath)?.pageViews ?? null : undefined,
                format: formatNumber,
              },
              {
                key: "avgTime",
                header: "Avg",
                align: "right",
                value: (r) => r.avgTime,
                prevValue: showCompare ? (r) => prevTopPages.get(r.pagePath)?.avgTime ?? null : undefined,
                format: formatDuration,
              },
            ]}
          />
        </DataCard>

        <DataCard title="Top sources" icon={Globe}>
          <TopNTable<TopSourcesRow>
            rows={topSources?.rows ?? []}
            loading={loading?.topSources}
            error={errors?.topSources}
            columns={[
              {
                key: "source",
                header: "Source / medium",
                render: (r) => (
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">
                      {r.source} / {r.medium}
                    </span>
                    <span className="text-[var(--theme-elevation-500)] text-[11px]">{r.channel}</span>
                  </div>
                ),
              },
              {
                key: "sessions",
                header: "Sessions",
                align: "right",
                value: (r) => r.sessions,
                prevValue:
                  showCompare ? (r) => prevTopSources.get(`${r.source}|${r.medium}`)?.sessions ?? null : undefined,
                format: formatNumber,
              },
            ]}
          />
        </DataCard>

        <DataCard title="Top events" icon={Sparkles}>
          <TopNTable<TopEventsRow>
            rows={topEvents?.rows ?? []}
            loading={loading?.topEvents}
            error={errors?.topEvents}
            columns={[
              {
                key: "eventName",
                header: "Event",
                font: "mono",
                render: (r) => r.eventName,
              },
              {
                key: "eventCount",
                header: "Count",
                align: "right",
                value: (r) => r.eventCount,
                prevValue: showCompare ? (r) => prevTopEvents.get(r.eventName)?.eventCount ?? null : undefined,
                format: formatNumber,
              },
              {
                key: "eventCountPerUser",
                header: "Count per user",
                align: "right",
                value: (r) => r.eventCountPerUser,
                prevValue: showCompare ? (r) => prevTopEvents.get(r.eventName)?.eventCountPerUser ?? null : undefined,
                format: (n) => n.toFixed(2),
              },
            ]}
          />
        </DataCard>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)" }}>
        <DataCard title="Devices" icon={MonitorSmartphone}>
          <DonutChart
            data={aggregateByDevice(topDevices?.rows ?? []).map((d) => ({
              label: d.deviceCategory.charAt(0).toUpperCase() + d.deviceCategory.slice(1),
              value: d.sessions,
              icon: getDeviceIcon(d.deviceCategory),
              prev: showCompare ? (prevDeviceSessions.get(d.deviceCategory) ?? undefined) : undefined,
            }))}
            loading={loading?.topDevices}
            error={errors?.topDevices}
          />
        </DataCard>

        <DataCard
          title={countriesMode === "city" ? "Top cities" : "Top countries"}
          icon={MapPin}
          action={
            onCountriesModeChange ?
              <MetricSwitcher<CountriesMode>
                value={countriesMode}
                onChange={onCountriesModeChange}
                options={[
                  { value: "country", label: "Country" },
                  { value: "city", label: "City" },
                ]}
              />
            : undefined
          }>
          <BarList
            rows={(topCountries?.rows ?? []).map(({ city, country, sessions }) => {
              const key = countriesMode === "city" ? city : country;
              const prevRow = prevTopCountries.get(key);
              return countriesMode === "city" ?
                  {
                    label: city,
                    sub: country || undefined,
                    value: sessions,
                    prev: showCompare ? (prevRow?.sessions ?? undefined) : undefined,
                  }
                : { label: country, value: sessions, prev: showCompare ? (prevRow?.sessions ?? undefined) : undefined };
            })}
            initialVisible={6}
            loading={loading?.topCountries}
            error={errors?.topCountries}
            format={formatNumber}
          />
        </DataCard>
      </div>
    </div>
  );
}
