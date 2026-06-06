"use client";

import { cn } from "../../../utils/style";
import type { CheckResult, Status } from "../../../engine/types";

export type Filter = "all" | Status;

interface PillProps {
  filter: Filter;
  label: string;
  count: number;
  active: boolean;
  onSelect: (f: Filter) => void;
  dot?: string;
}

function Pill({ filter, label, count, active, onSelect, dot }: PillProps) {
  return (
    <button type="button" className={cn("pillA", active && "on")} onClick={() => onSelect(filter)}>
      {dot && <span className="dot" style={{ background: dot }} />}
      {label} <span className="ct">{count}</span>
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
    <div className="sec-pills">
      <Pill filter="all" label="All" count={checks.length} active={value === "all"} onSelect={onChange} />
      <Pill filter="bad" label="Problems" count={countByStatus(checks, "bad")} active={value === "bad"} onSelect={onChange} dot="var(--seo-bad)" />
      <Pill filter="warn" label="Needs work" count={countByStatus(checks, "warn")} active={value === "warn"} onSelect={onChange} dot="var(--seo-warn)" />
      <Pill filter="good" label="Good" count={countByStatus(checks, "good")} active={value === "good"} onSelect={onChange} dot="var(--seo-good)" />
    </div>
  );
}
