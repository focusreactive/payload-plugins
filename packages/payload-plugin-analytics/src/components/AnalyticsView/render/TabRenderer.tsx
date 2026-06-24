"use client";

import type { ComponentType } from "react";
import { RowRenderer } from "./RowRenderer";
import type { ResolvedTab } from "../../../types/layout";
import type { Comparison, DateRange } from "../../../types/query";

export interface TabRendererProps {
  tab: ResolvedTab;
  clientRegistry: Record<string, { hasFetch: boolean }>;
  dateRange: DateRange;
  comparison: Comparison;
  t: (key: string) => string;
  blockComponents?: Record<string, ComponentType<Record<string, unknown>>>;
}

export function TabRenderer({
  tab,
  clientRegistry,
  dateRange,
  comparison,
  t,
  blockComponents,
}: TabRendererProps) {
  return (
    <div className="flex flex-col gap-4">
      {tab.rows.map((row) => (
        <RowRenderer
          key={row.id}
          row={row}
          clientRegistry={clientRegistry}
          dateRange={dateRange}
          comparison={comparison}
          t={t}
          blockComponents={blockComponents}
        />
      ))}
    </div>
  );
}
