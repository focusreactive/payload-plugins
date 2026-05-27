"use client";

import type { ImportMap } from "payload";
import { RowRenderer } from "./RowRenderer";
import type { BlockDefinition, BlockId, ResolvedTab } from "../../../types/layout";
import type { Comparison, DateRange } from "../../../types/query";

export interface TabRendererProps {
  tab: ResolvedTab;
  registry: Record<BlockId, BlockDefinition>;
  dateRange: DateRange;
  comparison: Comparison;
  t: (key: string) => string;
  importMap?: ImportMap;
}

export function TabRenderer({ tab, registry, dateRange, comparison, t, importMap }: TabRendererProps) {
  return (
    <div className="flex flex-col gap-4">
      {tab.rows.map((row) => (
        <RowRenderer
          key={row.id}
          row={row}
          registry={registry}
          dateRange={dateRange}
          comparison={comparison}
          t={t}
          importMap={importMap}
        />
      ))}
    </div>
  );
}
