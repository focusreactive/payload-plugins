"use client";

import type { ComponentType } from "react";
import { useAnalyticsParams } from "./hooks/useAnalyticsParams";
import { AnalyticsProviders } from "./AnalyticsProviders";
import { FilterBar } from "./FilterBar";
import { RefreshButton } from "./RefreshButton";
import { TabsNav } from "./TabsNav";
import { TabRenderer } from "./render/TabRenderer";
import { SessionsTab } from "./tabs/SessionsTab";
import { AbTab } from "./tabs/ab/AbTab";
import type { ResolvedLayout } from "../../types/layout";

export interface AnalyticsShellProps {
  title: string;
  layout: ResolvedLayout;
  clientRegistry: Record<string, { hasFetch: boolean }>;
  blockComponents?: Record<string, ComponentType<Record<string, unknown>>>;
  SessionsTabComponent?: ComponentType<Record<string, unknown>> | null;
  abEnabled?: boolean;
}

const noopT = (s: string) => s;

export function AnalyticsShell({ title, layout, clientRegistry, blockComponents, SessionsTabComponent, abEnabled }: AnalyticsShellProps) {
  const { tab, dateRange, comparison, sessions, setComparison, setDateRange, setSessions, setTab } = useAnalyticsParams();

  const overviewTab = layout.tabs.find((t) => t.id === "overview");
  const leadActionsTab = layout.tabs.find((t) => t.id === "lead-actions");

  return (
    <AnalyticsProviders>
      <div className="pa-analytics-view font-[family-name:var(--font-body)] text-(--theme-text) pb-(--gutter-h)">
        <header className="flex items-start gap-6 mb-5 flex-wrap">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-(--theme-elevation-1000) m-0">{title}</h1>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <RefreshButton />
            <FilterBar dateRange={dateRange} onDateRangeChange={setDateRange} comparison={comparison} onComparisonChange={setComparison} />
          </div>
        </header>

        <TabsNav active={tab} onChange={setTab} abEnabled={abEnabled} />

        {tab === "overview" && overviewTab && (
          <TabRenderer tab={overviewTab} clientRegistry={clientRegistry} dateRange={dateRange} comparison={comparison} t={noopT} blockComponents={blockComponents} />
        )}

        {tab === "lead-actions" && leadActionsTab && (
          <TabRenderer tab={leadActionsTab} clientRegistry={clientRegistry} dateRange={dateRange} comparison={comparison} t={noopT} blockComponents={blockComponents} />
        )}

        {tab === "sessions" &&
          (SessionsTabComponent ? (
            <SessionsTabComponent dateRange={dateRange} comparison={comparison} sessionsFilters={sessions} onSessionsFiltersChange={setSessions} />
          ) : (
            <SessionsTab dateRange={dateRange} filters={sessions} onFiltersChange={setSessions} />
          ))}

        {tab === "ab" && abEnabled && <AbTab dateRange={dateRange} comparison={comparison} />}
      </div>
    </AnalyticsProviders>
  );
}
