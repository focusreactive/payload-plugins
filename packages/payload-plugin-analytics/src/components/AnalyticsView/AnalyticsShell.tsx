"use client";

import type { ImportMap } from "payload";
import { RenderServerComponent } from "@payloadcms/ui/elements/RenderServerComponent";
import { useAnalyticsParams } from "./hooks/useAnalyticsParams";
import { AnalyticsProviders } from "./AnalyticsProviders";
import { FilterBar } from "./FilterBar";
import { RefreshButton } from "./RefreshButton";
import { TabsNav } from "./TabsNav";
import { TabRenderer } from "./render/TabRenderer";
import { SessionsTab } from "./tabs/SessionsTab";
import { getResolvedBlockRegistry, getResolvedLayout } from "../../config";

export interface AnalyticsShellProps {
  title: string;
  importMap?: ImportMap;
}

const noopT = (s: string) => s;

export function AnalyticsShell({ title, importMap }: AnalyticsShellProps) {
  const { tab, dateRange, comparison, sessions, setComparison, setDateRange, setSessions, setTab } =
    useAnalyticsParams();

  const resolved = getResolvedLayout();
  const registry = getResolvedBlockRegistry();

  const overviewTab = resolved.tabs.find((t) => t.id === "overview");
  const leadActionsTab = resolved.tabs.find((t) => t.id === "lead-actions");

  return (
    <AnalyticsProviders>
      <div className="pa-analytics-view font-[family-name:var(--font-body)] text-[var(--theme-text)]">
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

        {tab === "overview" && overviewTab && (
          <TabRenderer
            tab={overviewTab}
            registry={registry}
            dateRange={dateRange}
            comparison={comparison}
            t={noopT}
            importMap={importMap}
          />
        )}

        {tab === "lead-actions" && leadActionsTab && (
          <TabRenderer
            tab={leadActionsTab}
            registry={registry}
            dateRange={dateRange}
            comparison={comparison}
            t={noopT}
            importMap={importMap}
          />
        )}

        {tab === "sessions" &&
          (resolved.sessionsTabComponent && importMap ?
            <RenderServerComponent
              Component={resolved.sessionsTabComponent}
              clientProps={{
                dateRange,
                comparison,
                sessionsFilters: sessions,
                onSessionsFiltersChange: setSessions,
              }}
              importMap={importMap}
            />
          : <SessionsTab dateRange={dateRange} filters={sessions} onFiltersChange={setSessions} />)}
      </div>
    </AnalyticsProviders>
  );
}
