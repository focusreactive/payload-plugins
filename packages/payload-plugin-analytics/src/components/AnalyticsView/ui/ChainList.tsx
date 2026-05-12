import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import type { JourneyRow } from "../../../types/query";
import { getLeadActionIcon, LEAD_ACTION_LABELS } from "../icons";
import { SkeletonBlock } from "./SkeletonBlock";
import { ErrorTile } from "./ErrorTile";
import { EmptyTile } from "./EmptyTile";
import type { BlockStateProps } from "../types/blockState";
import type { LeadActionKind } from "../../../types/events";

export interface ChainListProps extends BlockStateProps {
  rows: JourneyRow[];
}

export function ChainList({ rows, loading, error, onRetry }: ChainListProps) {
  if (loading) return <SkeletonBlock shape="table" rows={5} />;
  if (error) return <ErrorTile error={error} onRetry={onRetry} />;
  if (rows.length === 0) return <EmptyTile message="No journeys in this range." />;

  return (
    <div className="flex flex-col">
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid grid-cols-[24px_1fr_70px_60px] items-center gap-3 py-2.5 px-1 border-b border-[var(--theme-elevation-100)] last:border-b-0">
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--theme-elevation-500)] text-right">
            {(i + 1).toString().padStart(2, "0")}
          </span>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin] [-webkit-mask-image:linear-gradient(to_right,black_95%,transparent)] [mask-image:linear-gradient(to_right,black_95%,transparent)]">
            {row.path.map(({ kind, value }, rowIndex) => (
              <Fragment key={rowIndex}>
                {kind === "leadAction" ?
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--theme-success-50)] text-[var(--theme-success-700)] border border-[var(--theme-success-100)] font-medium text-[11.5px] whitespace-nowrap shrink-0">
                    {(() => {
                      const Icon = getLeadActionIcon(value as LeadActionKind);

                      return <Icon size={11} />;
                    })()}

                    <span>{LEAD_ACTION_LABELS[value as LeadActionKind]}</span>
                  </span>
                : <span className="inline-flex items-center px-2 py-1 rounded-full bg-[var(--theme-elevation-100)] font-[family-name:var(--font-mono)] text-[var(--theme-elevation-800)] text-[11.5px] whitespace-nowrap shrink-0">
                    {value}
                  </span>
                }

                {rowIndex < row.path.length - 1 && (
                  <ChevronRight size={12} className="text-[var(--theme-elevation-300)] shrink-0" />
                )}
              </Fragment>
            ))}
          </div>

          <span className="text-right tabular-nums font-semibold text-[13px]">{row.count}</span>
          <span className="text-right text-[var(--theme-elevation-500)] tabular-nums text-[11.5px]">
            {row.conversionRate.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}
