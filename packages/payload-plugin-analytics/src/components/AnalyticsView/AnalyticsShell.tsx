"use client";

import { useAnalyticsParams } from "./hooks/useAnalyticsParams";
import { AnalyticsProviders } from "./AnalyticsProviders";
import { FilterBar } from "./FilterBar";
import { RefreshButton } from "./RefreshButton";
import { TabsNav } from "./TabsNav";
import { OverviewTab } from "./tabs/OverviewTab";
import { LeadActionsTab } from "./tabs/LeadActionsTab";
import { SessionsTab } from "./tabs/SessionsTab";

export interface AnalyticsShellProps {
  title: string;
}

export function AnalyticsShell({ title }: AnalyticsShellProps) {
  const { tab, dateRange, comparison, sessions, setComparison, setDateRange, setSessions, setTab } =
    useAnalyticsParams();

  return (
    <AnalyticsProviders>
      <div className="font-[family-name:var(--font-body)] text-[var(--theme-text)]">
        <header className="flex items-start gap-6 mb-5 flex-wrap">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-[var(--theme-elevation-1000)] m-0">{title}</h1>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <RefreshButton />
            <FilterBar
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              comparison={comparison}
              onComparisonChange={setComparison}
            />
          </div>
        </header>

        <TabsNav active={tab} onChange={setTab} />

        {tab === "overview" && <OverviewTab dateRange={dateRange} comparison={comparison} />}

        {tab === "lead-actions" && <LeadActionsTab dateRange={dateRange} comparison={comparison} />}

        {tab === "sessions" && <SessionsTab dateRange={dateRange} filters={sessions} onFiltersChange={setSessions} />}
      </div>
    </AnalyticsProviders>
  );
}
