import type { LucideIcon } from "lucide-react";
import { Metric } from "./Metric";
import { SetupWarningIcon } from "./SetupWarningIcon";
import { SkeletonBlock } from "./SkeletonBlock";
import { ErrorTile } from "./ErrorTile";
import { cn } from "../../../utils/style";
import type { BlockStateProps } from "../types/blockState";

export interface KpiCardProps extends BlockStateProps {
  label: string;
  icon?: LucideIcon;
  value: number;
  format: (n: number) => string;
  prevValue?: number | null;
  invertDelta?: boolean;
  className?: string;
}

export function KpiCard(props: KpiCardProps) {
  const { label, icon: Icon, value, format, prevValue, invertDelta, loading, error, onRetry, missing, className } = props;

  if (loading) {
    return (
      <div className={cn("bg-[var(--theme-elevation-0)] border border-[var(--theme-border-color)] rounded-[var(--style-radius-m)] p-4 flex flex-col gap-2.5", className)}>
        <SkeletonBlock shape="kpi" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("bg-[var(--theme-elevation-0)] border border-[var(--theme-border-color)] rounded-[var(--style-radius-m)] p-4", className)}>
        <ErrorTile error={error} onRetry={onRetry} />
      </div>
    );
  }

  const showPending = (missing?.length ?? 0) > 0;

  return (
    <div className={cn("bg-[var(--theme-elevation-0)] border border-[var(--theme-border-color)] rounded-[var(--style-radius-m)] p-4 flex flex-col gap-2.5 relative", className)}>
      <div className="flex items-center gap-2 text-xs text-[var(--theme-elevation-500)] font-medium">
        {Icon && <Icon size={13} />}
        <span>{label}</span>
        {showPending && <SetupWarningIcon missingKey={missing![0]!} />}
      </div>

      <div data-setup-pending={showPending ? "true" : undefined} className={showPending ? "opacity-50 pointer-events-none saturate-50" : undefined}>
        <Metric value={value} prevValue={prevValue ?? null} format={format} invertDelta={invertDelta} mode="large" />
      </div>
    </div>
  );
}
