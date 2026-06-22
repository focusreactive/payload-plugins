"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import { getBucketColor, getBucketLabel, formatPValue } from "./format";
import { cn } from "../../../../utils/style";
import { AB_CONTROL_BUCKET } from "../../../../constants/ab";

export type LiftTone = "is-up" | "is-down" | "is-ns";

export function abLiftClass(tone: LiftTone, big?: boolean) {
  return cn(
    "inline-flex items-center gap-0.5 text-[12.5px] tabular-nums",
    tone === "is-up" && "font-semibold text-(--theme-success-700) dark:text-(--theme-success-500)",
    tone === "is-down" && "font-semibold text-(--theme-error-500)",
    tone === "is-ns" && "font-medium text-(--theme-elevation-500)",
    big && "text-[15px]"
  );
}

export interface BestLift {
  relativeLift: number | null;
  significant: boolean;
  pValue: number | null;
}

export function LiftCell({ lift, big }: { lift: BestLift; big?: boolean }) {
  if (lift.relativeLift == null) return <span className={abLiftClass("is-ns")}>—</span>;

  const tone: LiftTone = !lift.significant ? "is-ns" : lift.relativeLift >= 0 ? "is-up" : "is-down";
  const Arrow = lift.relativeLift >= 0 ? ArrowUp : ArrowDown;
  const value = lift.relativeLift * 100;
  const title = lift.significant
    ? `Significant · p = ${lift.pValue != null ? formatPValue(lift.pValue) : "—"}`
    : `Not yet significant · p = ${lift.pValue != null ? formatPValue(lift.pValue) : "—"}`;

  return (
    <span className={abLiftClass(tone, big)} title={title}>
      {lift.significant && <Arrow size={big ? 14 : 12} />}
      {(value >= 0 ? "+" : "") + value.toFixed(1)}%
    </span>
  );
}

export interface SrmInfo {
  passed: boolean;
  pValue: number;
  buckets: Array<{
    bucket: string;
    name: string | null;
    observedShare: number;
    configuredShare: number | null;
  }>;
}

export function SrmDot({ srm }: { srm: SrmInfo }) {
  return (
    <span className="group/srm relative inline-flex outline-none" tabIndex={0}>
      <span
        className={cn(
          "h-[9px] w-[9px] rounded-full",
          srm.passed
            ? "bg-(--theme-success-500) shadow-[0_0_0_3px_var(--theme-success-100)]"
            : "bg-(--theme-error-500) shadow-[0_0_0_3px_var(--theme-error-50)]"
        )}
      />
    </span>
  );
}

export function BucketName({
  bucket,
  name,
  index,
}: {
  bucket: string;
  name: string | null;
  index: number;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-[7px]">
      <span
        className="h-[9px] w-[9px] shrink-0 rounded-[3px]"
        style={{ background: getBucketColor(index) }}
      />
      <span className="font-medium text-(--theme-elevation-900)">
        {getBucketLabel(bucket, name)}
      </span>
      {bucket !== AB_CONTROL_BUCKET && (
        <span className="font-[family-name:var(--font-mono)] text-[10.5px] text-(--theme-elevation-400)">
          {bucket}
        </span>
      )}
    </span>
  );
}
