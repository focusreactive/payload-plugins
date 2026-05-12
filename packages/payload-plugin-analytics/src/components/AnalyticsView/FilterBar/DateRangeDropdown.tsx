"use client";

import { useState } from "react";
import { Calendar, ChevronDown, ChevronRight, Check } from "lucide-react";
import { Dropdown } from "../ui/Dropdown";
import { formatShortDate } from "../numberFormatters";
import type { DateRange, DateRangePreset } from "../../../types/query";
import { DateRangeCalendar } from "./DateRangeCalendar";

interface Preset {
  value: DateRangePreset;
  label: string;
}

export const PRESETS: Preset[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last-7d", label: "Last 7 days" },
  { value: "last-14d", label: "Last 14 days" },
  { value: "last-30d", label: "Last 30 days" },
  { value: "last-90d", label: "Last 90 days" },
];

function labelOf(value: DateRange) {
  if ("preset" in value) return PRESETS.find((p) => p.value === value.preset)?.label ?? "Custom range";

  return `${formatShortDate(value.from)} – ${formatShortDate(value.to)}`;
}

export interface DateRangeDropdownProps {
  value: DateRange;
  onChange: (next: DateRange) => void;
}

export function DateRangeDropdown({ value, onChange }: DateRangeDropdownProps) {
  const [calOpen, setCalOpen] = useState(false);

  return (
    <div className="relative">
      <Dropdown
        trigger={
          <>
            <Calendar size={13} />
            <span className="font-medium">{labelOf(value)}</span>
            <ChevronDown size={12} className="text-[var(--theme-elevation-500)]" />
          </>
        }>
        {(close) => (
          <>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--theme-elevation-500)] px-2.5 pt-1.5 pb-1">
              Presets
            </div>

            {PRESETS.map(({ label, value: presetValue }) => {
              const isActive = "preset" in value && value.preset === presetValue;

              return (
                <div
                  key={presetValue}
                  role="button"
                  className="flex justify-between items-center px-2.5 py-1.5 text-sm rounded-[var(--style-radius-s)] cursor-pointer hover:bg-[var(--theme-elevation-100)]"
                  onClick={() => {
                    onChange({ preset: presetValue });
                    close();
                  }}>
                  <span>{label}</span>

                  {isActive && <Check size={13} className="text-[var(--theme-elevation-1000)]" />}
                </div>
              );
            })}

            <div className="h-px bg-[var(--theme-border-color)] my-1 mx-0.5" />

            <div
              role="button"
              className="flex justify-between items-center px-2.5 py-1.5 text-sm rounded-[var(--style-radius-s)] cursor-pointer hover:bg-[var(--theme-elevation-100)]"
              onClick={() => {
                setCalOpen(true);
                close();
              }}>
              <span>Custom range…</span>

              <ChevronRight size={13} className="text-[var(--theme-elevation-500)]" />
            </div>
          </>
        )}
      </Dropdown>

      {calOpen && (
        <DateRangeCalendar
          value={value}
          onApply={(next) => {
            onChange(next);
            setCalOpen(false);
          }}
          onClose={() => setCalOpen(false)}
        />
      )}
    </div>
  );
}
