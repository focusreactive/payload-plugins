"use client";

import { GitCompareArrows, ChevronDown, Check } from "lucide-react";
import { Dropdown } from "../ui/Dropdown";
import type { Comparison } from "../../../types/query";

interface Option {
  value: Comparison["kind"];
  label: string;
  disabled?: boolean;
}

const OPTIONS: Option[] = [
  { value: "none", label: "None" },
  { value: "previous-period", label: "Previous period" },
];

export interface ComparisonDropdownProps {
  value: Comparison;
  onChange: (next: Comparison) => void;
}

export function ComparisonDropdown({ value, onChange }: ComparisonDropdownProps) {
  const activeLabel = value.kind === "previous-period" ? "Previous period" : "No comparison";

  return (
    <Dropdown
      triggerClassName={value.kind === "none" ? "text-[var(--theme-elevation-500)]" : undefined}
      trigger={
        <>
          <GitCompareArrows size={13} />
          <span className="font-medium">{activeLabel}</span>
          <ChevronDown size={12} className="text-[var(--theme-elevation-500)]" />
        </>
      }>
      {(close) => (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--theme-elevation-500)] px-2.5 pt-1.5 pb-1">
            Compare to
          </div>

          {OPTIONS.map(({ label, value: optionValue, disabled }) => {
            const isActive = !disabled && (optionValue === "none" ? value.kind === "none" : value.kind === optionValue);

            return (
              <div
                key={optionValue}
                role="button"
                aria-disabled={disabled || undefined}
                className={
                  disabled ?
                    "flex justify-between items-center px-2.5 py-1.5 text-sm text-[var(--theme-elevation-300)] cursor-not-allowed"
                  : "flex justify-between items-center px-2.5 py-1.5 text-sm rounded-[var(--style-radius-s)] cursor-pointer hover:bg-[var(--theme-elevation-100)]"
                }
                onClick={() => {
                  if (disabled) return;

                  onChange(optionValue === "none" ? { kind: "none" } : { kind: "previous-period" });
                  close();
                }}>
                <span className="flex items-center gap-2">{label}</span>
                {isActive && <Check size={13} className="text-[var(--theme-elevation-1000)]" />}
              </div>
            );
          })}
        </>
      )}
    </Dropdown>
  );
}
