"use client";

import type { LucideIcon } from "lucide-react";
import { FlaskConical, Split, Activity, Zap, Clock, AlertOctagon, Trophy } from "lucide-react";
import { formatNumber } from "../../numberFormatters";
import { cn } from "../../../../utils/style";
import type { AbKpisResponse } from "../../../../types/ab";

function Card({ icon: Icon, label, value, sub, tone }: { icon: LucideIcon; label: string; value: string | number; sub?: string; tone?: "warn" | "ok" }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[7px] rounded-(--style-radius-m) border border-(--theme-border-color) bg-(--theme-elevation-0) px-3.5 pb-[13px] pt-3",
        tone === "warn" && "border-(--theme-warning-200) bg-(--theme-warning-50)"
      )}
    >
      <div className={cn("inline-flex items-center gap-1.5 text-xs text-(--theme-elevation-600)", tone === "warn" ? "[&_svg]:text-(--theme-warning-700)" : "[&_svg]:text-(--theme-elevation-500)")}>
        <Icon size={13} />
        <span>{label}</span>
      </div>

      <div
        className={cn(
          "text-[23px] font-semibold tracking-[-0.01em]",
          tone === "warn" ? "text-(--theme-warning-700)" : tone === "ok" ? "text-(--theme-success-700) dark:text-(--theme-success-500)" : "text-(--theme-elevation-1000)"
        )}
      >
        {value}
      </div>

      {sub && (
        <div className="inline-flex items-center gap-2 text-[11px]">
          <span className="text-[11px] text-(--theme-elevation-500)">{sub}</span>
        </div>
      )}
    </div>
  );
}

export function AbKpiStrip({ data }: { data?: AbKpisResponse }) {
  const { activeExperiments, avgAgeDays, exposedSessions, leadConversions, needingAttention, variantsLive, winRate } = data ?? {};
  const attentionTone = (needingAttention ?? 0) > 0 ? "warn" : "ok";

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
      <Card
        icon={Trophy}
        label="Win rate"
        value={winRate?.rate ? `${Math.round(winRate.rate * 100)}%` : "—"}
        sub={winRate ? `${winRate.winners}/${winRate.qualified} qualified · ${winRate.notQualified} not yet` : undefined}
      />

      <Card icon={FlaskConical} label="Active experiments" value={activeExperiments ?? "—"} sub="recorded" />

      <Card icon={Split} label="Variants live" value={variantsLive ?? "—"} sub="across experiments" />

      <Card icon={Activity} label="Exposed sessions" value={exposedSessions ? formatNumber(exposedSessions) : "—"} />

      <Card icon={Zap} label="Lead conversions" value={leadConversions ? formatNumber(leadConversions) : "—"} sub="on experiment pages" />

      <Card icon={Clock} label="Avg experiment age" value={avgAgeDays ? `${avgAgeDays}d` : "—"} sub="median · now − started" />

      <Card
        icon={AlertOctagon}
        label="Needing attention"
        value={needingAttention ?? "—"}
        tone={attentionTone}
        sub={needingAttention ? (needingAttention ? "SRM failing — see below" : "all splits healthy") : undefined}
      />
    </div>
  );
}
