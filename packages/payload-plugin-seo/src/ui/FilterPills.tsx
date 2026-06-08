"use client";

import { cva } from "class-variance-authority";
import { cn } from "../utils/style";
import type { CheckResult, Status } from "../engine/types";
import { statusVar } from "../components/SeoDrawer/variants";

export type Filter = "all" | Status;

const filterPillVariants = cva("inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-[20px] border text-[11px] font-medium cursor-pointer", {
  variants: {
    active: {
      true: "bg-neutral-1000 text-neutral-0 border-neutral-1000",
      false: "border-neutral-200 bg-neutral-0 text-neutral-700",
    },
  },
  defaultVariants: { active: false },
});

interface PillProps {
  filter: Filter;
  label: string;
  count: number;
  active: boolean;
  onSelect: (f: Filter) => void;
  dotStatus?: Status;
}

function Pill({ filter, label, count, active, onSelect, dotStatus }: PillProps) {
  return (
    <button type="button" className={filterPillVariants({ active })} onClick={() => onSelect(filter)}>
      {dotStatus && <span className={cn("w-[6px] h-[6px] rounded-full inline-block", statusVar({ status: dotStatus }))} style={{ background: "var(--seo-c)" }} />}
      {label} <span className="font-mono font-bold">{count}</span>
    </button>
  );
}

function countByStatus(checks: CheckResult[], status: Status) {
  return checks.filter((c) => c.status === status).length;
}

interface FilterPillsProps {
  checks: CheckResult[];
  value: Filter;
  onChange: (f: Filter) => void;
}

export function FilterPills({ checks, value, onChange }: FilterPillsProps) {
  return (
    <div className="flex gap-[6px] flex-wrap px-[15px] py-[11px]">
      <Pill filter="all" label="All" count={checks.length} active={value === "all"} onSelect={onChange} />
      <Pill filter="bad" label="Problems" count={countByStatus(checks, "bad")} active={value === "bad"} onSelect={onChange} dotStatus="bad" />
      <Pill filter="warn" label="Needs work" count={countByStatus(checks, "warn")} active={value === "warn"} onSelect={onChange} dotStatus="warn" />
      <Pill filter="good" label="Good" count={countByStatus(checks, "good")} active={value === "good"} onSelect={onChange} dotStatus="good" />
    </div>
  );
}
