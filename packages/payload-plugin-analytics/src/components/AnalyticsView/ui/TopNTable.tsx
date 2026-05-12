import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../../utils/style";
import { SkeletonBlock } from "./SkeletonBlock";
import { ErrorTile } from "./ErrorTile";
import { EmptyTile } from "./EmptyTile";
import type { BlockStateProps } from "../types/blockState";

export interface TopNTableColumn<Row> {
  key: string;
  header: string;
  align?: "left" | "right";
  font?: "body" | "mono";
  muted?: boolean;
  render?: (row: Row) => ReactNode;
}

export interface TopNTableProps<Row> extends BlockStateProps {
  rows: Row[];
  columns: TopNTableColumn<Row>[];
  initialVisible?: number;
  emptyMessage?: string;
}

export function TopNTable<Row extends object>({
  rows,
  columns,
  initialVisible = 5,
  emptyMessage = "No data in this range.",
  loading,
  error,
  onRetry,
}: TopNTableProps<Row>) {
  const [expanded, setExpanded] = useState(false);

  if (loading) return <SkeletonBlock shape="table" rows={initialVisible} />;
  if (error) return <ErrorTile error={error} onRetry={onRetry} />;
  if (rows.length === 0) return <EmptyTile message={emptyMessage} />;

  const visible = expanded ? rows : rows.slice(0, initialVisible);

  return (
    <div>
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            {columns.map(({ key, header, align }) => (
              <th
                key={key}
                className={cn(
                  "text-left p-2 text-[10px] tracking-widest uppercase text-[var(--theme-elevation-500)] font-semibold border-b border-[var(--theme-border-color)]",
                  align === "right" && "text-right tabular-nums",
                )}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--theme-elevation-50)]">
              {columns.map(({ key, align, font, muted, render }) => (
                <td
                  key={key}
                  className={cn(
                    "p-2 border-b border-[var(--theme-elevation-100)]",
                    align === "right" && "text-right tabular-nums",
                    font === "mono" && "font-[family-name:var(--font-mono)] text-xs",
                    muted && "text-[var(--theme-elevation-500)]",
                  )}>
                  {render ? render(row) : ((row as Record<string, unknown>)[key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length > initialVisible && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--theme-elevation-500)] hover:text-[var(--theme-elevation-1000)]">
          {expanded ? "Show less" : `Show all (${rows.length})`}

          <ChevronRight size={11} />
        </button>
      )}
    </div>
  );
}
