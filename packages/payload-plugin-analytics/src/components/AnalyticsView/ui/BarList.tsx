import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../../utils/style";
import { formatNumber } from "../numberFormatters";
import { Metric } from "./Metric";
import { SkeletonBlock } from "./SkeletonBlock";
import { ErrorTile } from "./ErrorTile";
import { EmptyTile } from "./EmptyTile";
import type { BlockStateProps } from "../types/blockState";

export interface BarListRow {
  label: string;
  sub?: string;
  value: number;
  prev?: number;
  color?: string;
}

export interface BarListProps<R extends BarListRow = BarListRow> extends BlockStateProps {
  rows: R[];
  initialVisible?: number;
  getIcon?: (row: R) => LucideIcon | undefined;
  format?: (n: number) => string;
  invertDelta?: boolean;
}

export function BarList<R extends BarListRow>({ rows, initialVisible = 5, getIcon, loading, error, onRetry, format = formatNumber, invertDelta }: BarListProps<R>) {
  const [expanded, setExpanded] = useState(false);

  if (loading) return <SkeletonBlock shape="table" rows={initialVisible} />;
  if (error) return <ErrorTile error={error} onRetry={onRetry} />;
  if (rows.length === 0) return <EmptyTile message="No data in this range." />;

  const hasPrev = rows.some((r) => r.prev != null);
  const max = Math.max(0, ...rows.map((r) => r.value), ...rows.map((r) => r.prev ?? 0));
  const totalRows = rows.reduce((a, r) => a + r.value, 0);
  const visibleRows = expanded ? rows : rows.slice(0, initialVisible);

  return (
    <div>
      <div className="flex flex-col gap-2">
        {visibleRows.map((row, i) => {
          const { label, value, color, sub, prev } = row;
          const Icon = getIcon?.(row);
          const percent = totalRows === 0 ? 0 : (value / totalRows) * 100;
          const widthCurrent = max === 0 ? 0 : (value / max) * 100;
          const widthPrev = max === 0 || prev == null ? 0 : (prev / max) * 100;

          return (
            <div key={i} className="grid grid-cols-[minmax(160px,1fr)_minmax(140px,2fr)_120px_50px] gap-3 items-center">
              <div className="flex items-center gap-2 min-w-0">
                {Icon && <Icon size={13} className="text-[var(--theme-elevation-500)] shrink-0" />}
                <div className="min-w-0">
                  <div className="truncate">{label}</div>
                  {sub && <div className="text-[var(--theme-elevation-500)] text-[11px]">{sub}</div>}
                </div>
              </div>

              <div className="h-2 bg-[var(--theme-elevation-100)] rounded overflow-hidden relative">
                {prev != null && (
                  <div
                    data-bar-role="prev"
                    className="absolute inset-y-0 left-0 rounded"
                    style={{
                      width: `${widthPrev}%`,
                      background: "rgba(120,120,120,0.55)",
                      zIndex: 1,
                    }}
                  />
                )}
                <div
                  data-bar-role="current"
                  className="absolute inset-y-0 left-0 rounded"
                  style={{
                    width: `${widthCurrent}%`,
                    background: color ?? "var(--theme-elevation-700)",
                    zIndex: 2,
                  }}
                />
              </div>

              <div className="text-right">
                {hasPrev ? (
                  <Metric value={value} prevValue={prev ?? null} format={format} invertDelta={invertDelta} mode="inline" />
                ) : (
                  <span className="tabular-nums text-[12.5px]">{format(value)}</span>
                )}
              </div>
              <div className="text-right text-[var(--theme-elevation-500)] text-[11px]">{percent.toFixed(1)}%</div>
            </div>
          );
        })}
      </div>

      {rows.length > initialVisible && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={cn("mt-2.5 inline-flex items-center gap-1 text-[11px] text-[var(--theme-elevation-500)] hover:text-[var(--theme-elevation-1000)]")}
        >
          {expanded ? "Show less" : `+${rows.length - initialVisible} more`}
          <ChevronRight size={11} />
        </button>
      )}
    </div>
  );
}
