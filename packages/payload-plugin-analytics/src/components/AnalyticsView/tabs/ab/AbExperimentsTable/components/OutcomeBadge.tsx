import type { LucideIcon } from "lucide-react";
import { AlertOctagon, Trophy, Minus, CircleDot } from "lucide-react";
import { cn } from "../../../../../../utils/style";
import type { AbExperimentOutcome } from "../../../../../../types/ab";
import { outcomeBadgeVariants, type OutcomeBadgeTone } from "../variants";

const OUTCOME_META: Record<AbExperimentOutcome, { label: string; icon: LucideIcon; tone: OutcomeBadgeTone }> = {
  srm: { label: "Check split", icon: AlertOctagon, tone: "error" },
  winner: { label: "Winner", icon: Trophy, tone: "success" },
  no_effect: { label: "No effect", icon: Minus, tone: "neutral" },
  collecting: { label: "Collecting", icon: CircleDot, tone: "live" },
};

export function OutcomeBadge({ outcome }: { outcome: AbExperimentOutcome }) {
  const m = OUTCOME_META[outcome];
  const Icon = m.icon;
  return (
    <span className={cn(outcomeBadgeVariants({ tone: m.tone }))}>
      {m.tone === "live" ?
        <span className="h-[7px] w-[7px] rounded-full bg-(--theme-success-500) shadow-[0_0_0_3px_var(--theme-success-100)]" />
      : <Icon size={11} />}
      {m.label}
    </span>
  );
}
