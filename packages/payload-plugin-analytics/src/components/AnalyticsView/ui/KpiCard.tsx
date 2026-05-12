import { ArrowUp, ArrowDown, type LucideIcon } from "lucide-react";
import { cn } from "../../../utils/style";
import { formatDuration, formatNumber, formatPercentage } from "../numberFormatters";
import { SetupWarningIcon } from "./SetupWarningIcon";
import { SkeletonBlock } from "./SkeletonBlock";
import { ErrorTile } from "./ErrorTile";
import type { BlockStateProps } from "../types/blockState";

export interface KpiCardProps extends BlockStateProps {
  label: string;
  icon?: LucideIcon;
  value: number;
  formatter: "number" | "percent" | "duration";
  delta?: number;
  deltaUnit?: "percent" | "pp";
  invertDelta?: boolean;
  prevValue?: number | null;
}

function formatValue(value: number, kind: KpiCardProps["formatter"]) {
  if (kind === "percent") return formatPercentage(value);
  if (kind === "duration") return formatDuration(value);

  return formatNumber(value);
}

export function KpiCard(props: KpiCardProps) {
  const {
    label,
    icon: Icon,
    value,
    formatter,
    delta,
    deltaUnit = "percent",
    invertDelta = false,
    prevValue,
    loading,
    error,
    onRetry,
    missing,
  } = props;

  if (loading) {
    return (
      <div className="bg-[var(--theme-elevation-0)] border border-[var(--theme-border-color)] rounded-[var(--style-radius-m)] p-4 flex flex-col gap-2.5">
        <SkeletonBlock shape="kpi" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--theme-elevation-0)] border border-[var(--theme-border-color)] rounded-[var(--style-radius-m)] p-4">
        <ErrorTile error={error} onRetry={onRetry} />
      </div>
    );
  }

  const tone =
    delta == null ? "neutral"
    : delta > 0 ?
      invertDelta ? "negative"
      : "positive"
    : invertDelta ? "positive"
    : "negative";

  const DeltaIcon = (delta ?? 0) >= 0 ? ArrowUp : ArrowDown;
  const deltaStr = delta == null ? null : `${Math.abs(delta).toFixed(1)}${deltaUnit === "pp" ? " pp" : "%"}`;
  const showPending = (missing?.length ?? 0) > 0;

  return (
    <div
      data-tone={tone}
      className="bg-[var(--theme-elevation-0)] border border-[var(--theme-border-color)] rounded-[var(--style-radius-m)] p-4 flex flex-col gap-2.5 relative">
      <div className="flex items-center gap-2 text-xs text-[var(--theme-elevation-500)] font-medium">
        {Icon && <Icon size={13} />}

        <span>{label}</span>

        {showPending && <SetupWarningIcon missingKey={missing![0]!} />}
      </div>

      <div
        data-setup-pending={showPending ? "true" : undefined}
        className={showPending ? "opacity-50 pointer-events-none saturate-50" : undefined}>
        <div className="text-[28px] font-semibold leading-[1.1] tracking-tight text-[var(--theme-elevation-1000)] tabular-nums">
          {formatValue(value, formatter)}
        </div>

        <div className="flex items-center gap-2.5 text-xs mt-1">
          {deltaStr && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium tabular-nums",
                tone === "positive" && "text-[var(--theme-success-700)]",
                tone === "negative" && "text-[var(--theme-error-500)]",
              )}>
              <DeltaIcon size={12} />

              {deltaStr}
            </span>
          )}

          {prevValue != null && (
            <span className="text-[var(--theme-elevation-500)] font-[family-name:var(--font-mono)] text-[11px]">
              vs {formatValue(prevValue, formatter)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
