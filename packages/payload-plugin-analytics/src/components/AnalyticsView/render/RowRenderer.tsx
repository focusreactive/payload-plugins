"use client";

import type { ComponentType } from "react";
import { BlockRenderer } from "./BlockRenderer";
import type { BlockId, ResolvedRow } from "../../../types/layout";
import type { Comparison, DateRange } from "../../../types/query";

export interface RowRendererProps {
  row: ResolvedRow;
  clientRegistry: Record<string, { hasFetch: boolean }>;
  dateRange: DateRange;
  comparison: Comparison;
  t: (key: string) => string;
  blockComponents?: Record<string, ComponentType<Record<string, unknown>>>;
}

export function RowRenderer({
  row,
  clientRegistry,
  dateRange,
  comparison,
  t,
  blockComponents,
}: RowRendererProps) {
  const blocks = row.blocks as unknown as Array<{ id: BlockId; order: number; colSpan: number }>;

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${row.columns}, minmax(0, 1fr))` }}
    >
      {blocks.map((b) => {
        const entry = clientRegistry[b.id];

        return (
          <div key={b.id} data-block-cell="" style={{ gridColumn: `span ${b.colSpan}` }}>
            <BlockRenderer
              blockId={b.id}
              Component={blockComponents?.[b.id]}
              hasFetch={Boolean(entry?.hasFetch)}
              dateRange={dateRange}
              comparison={comparison}
              colSpan={b.colSpan}
              t={t}
            />
          </div>
        );
      })}
    </div>
  );
}
