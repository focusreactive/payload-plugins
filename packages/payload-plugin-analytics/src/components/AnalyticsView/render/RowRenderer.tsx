"use client";

import type { ImportMap } from "payload";
import { BlockRenderer } from "./BlockRenderer";
import type { BlockDefinition, BlockId, ResolvedRow } from "../../../types/layout";
import type { Comparison, DateRange } from "../../../types/query";

export interface RowRendererProps {
  row: ResolvedRow;
  registry: Record<BlockId, BlockDefinition>;
  dateRange: DateRange;
  comparison: Comparison;
  t: (key: string) => string;
  importMap?: ImportMap;
}

export function RowRenderer({ row, registry, dateRange, comparison, t, importMap }: RowRendererProps) {
  const blocks = row.blocks as unknown as Array<{ id: BlockId; order: number; colSpan: number }>;

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${row.columns}, minmax(0, 1fr))` }}>
      {blocks.map((b) => {
        const def = registry[b.id];

        return (
          <div key={b.id} data-block-cell="" style={{ gridColumn: `span ${b.colSpan}` }}>
            <BlockRenderer
              blockId={b.id}
              componentPath={def?.component ?? ""}
              hasFetch={Boolean(def?.fetch)}
              dateRange={dateRange}
              comparison={comparison}
              colSpan={b.colSpan}
              t={t}
              importMap={importMap}
            />
          </div>
        );
      })}
    </div>
  );
}
