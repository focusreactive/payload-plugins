import { useState } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "../../../utils/style";
import { formatNumber } from "../numberFormatters";
import { SkeletonBlock } from "./SkeletonBlock";
import { ErrorTile } from "./ErrorTile";
import { EmptyTile } from "./EmptyTile";
import type { BlockStateProps } from "../types/blockState";

export interface BarListRow {
  label: string;
  sub?: string;
  value: number;
  color?: string;
}

export interface BarListProps<R extends BarListRow = BarListRow> extends BlockStateProps {
  rows: R[];
  initialVisible?: number;
  getIcon?: (row: R) => LucideIcon | undefined;
}

export function BarList<R extends BarListRow>({
  rows,
  initialVisible = 5,
  getIcon,
  loading,
  error,
  onRetry,
}: BarListProps<R>) {
  const [expanded, setExpanded] = useState(false);

  if (loading) return <SkeletonBlock shape="table" rows={initialVisible} />;
  if (error) return <ErrorTile error={error} onRetry={onRetry} />;
  if (rows.length === 0) return <EmptyTile message="No data in this range." />;

  const max = Math.max(...rows.map((r) => r.value));
  const totalRows = rows.reduce((a, r) => a + r.value, 0);
  const visibleRows = expanded ? rows : rows.slice(0, initialVisible);

  return (
    <div>
      <div className="flex flex-col gap-2">
        {visibleRows.map((row, i) => {
          const { label, value, color, sub } = row;
          const Icon = getIcon?.(row);
          const percent = totalRows === 0 ? 0 : (value / totalRows) * 100;

          return (
            <div key={i} className="grid grid-cols-[minmax(160px,1fr)_minmax(140px,2fr)_56px_50px] gap-3 items-center">
              <div className="flex items-center gap-2 min-w-0">
                {Icon && <Icon size={13} className="text-[var(--theme-elevation-500)] shrink-0" />}

                <div className="min-w-0">
                  <div className="truncate">{label}</div>

                  {sub && <div className="text-[var(--theme-elevation-500)] text-[11px]">{sub}</div>}
                </div>
              </div>

              <div className="h-2 bg-[var(--theme-elevation-100)] rounded overflow-hidden relative">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${max === 0 ? 0 : (value / max) * 100}%`,
                    background: color ?? "var(--theme-elevation-700)",
                  }}
                />
              </div>

              <div className="text-right tabular-nums text-[12.5px]">{formatNumber(value)}</div>
              <div className="text-right text-[var(--theme-elevation-500)] text-[11px]">{percent.toFixed(1)}%</div>
            </div>
          );
        })}
      </div>

      {rows.length > initialVisible && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={cn(
            "mt-2.5 inline-flex items-center gap-1 text-[11px] text-[var(--theme-elevation-500)] hover:text-[var(--theme-elevation-1000)]",
          )}>
          {expanded ? "Show less" : `+${rows.length - initialVisible} more`}

          <ChevronRight size={11} />
        </button>
      )}
    </div>
  );
}
