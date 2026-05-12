"use client";

import { useAnalyticsParams } from "./hooks/useAnalyticsParams";
import { FilterBar } from "./FilterBar";
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
    <div className="font-[family-name:var(--font-body)] text-[var(--theme-text)]">
      <header className="flex items-start gap-6 mb-5 flex-wrap">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-[var(--theme-elevation-1000)] m-0">{title}</h1>
        </div>

        <FilterBar
          className="mr-auto"
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          comparison={comparison}
          onComparisonChange={setComparison}
        />
      </header>

      <TabsNav active={tab} onChange={setTab} />

      {tab === "overview" && <OverviewTab comparison={comparison} />}
      {tab === "lead-actions" && <LeadActionsTab comparison={comparison} />}
      {tab === "sessions" && <SessionsTab filters={sessions} onFiltersChange={setSessions} />}
    </div>
  );
}
