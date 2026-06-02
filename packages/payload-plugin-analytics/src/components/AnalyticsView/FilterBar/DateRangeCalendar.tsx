"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange as DPRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import type { DateRange, DateRangePreset } from "../../../types/query";
import { PRESETS } from "./DateRangeDropdown";

function isoToDate(s: string) {
  return new Date(`${s}T00:00:00Z`);
}

function dateToIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export interface DateRangeCalendarProps {
  value: DateRange;
  onApply: (next: DateRange) => void;
  onClose: () => void;
}

export function DateRangeCalendar({ value, onApply, onClose }: DateRangeCalendarProps) {
  const initial: DPRange | undefined = "from" in value ? { from: isoToDate(value.from), to: isoToDate(value.to) } : undefined;
  const [picked, setPicked] = useState<DPRange | undefined>(initial);
  const [activePreset, setActivePreset] = useState<DateRangePreset | null>("preset" in value ? value.preset : null);

  return (
    <div
      className="absolute top-full right-0 mt-1.5 bg-[var(--theme-elevation-0)] border border-[var(--theme-border-color)] rounded-[var(--style-radius-m)] shadow-popover p-3.5 z-50 flex gap-3.5"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-0.5 min-w-[140px] pr-3.5 border-r border-[var(--theme-border-color)]">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--theme-elevation-500)] px-1 pt-1 pb-1">Presets</div>

        {PRESETS.map(({ label, value: presetValue }) => (
          <button
            key={presetValue}
            type="button"
            onClick={() => {
              setActivePreset(presetValue);
              setPicked(undefined);
            }}
            className={
              activePreset === presetValue
                ? "text-left bg-[var(--theme-elevation-100)] text-[var(--theme-elevation-1000)] font-medium px-2.5 py-1.5 rounded-[var(--style-radius-s)] text-xs"
                : "text-left text-[var(--theme-elevation-700)] hover:bg-[var(--theme-elevation-100)] px-2.5 py-1.5 rounded-[var(--style-radius-s)] text-xs"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <DayPicker
          mode="range"
          selected={picked}
          onSelect={(range) => {
            setPicked(range);
            setActivePreset(null);
          }}
        />

        <div className="mt-2.5 pt-2.5 border-t border-[var(--theme-border-color)] flex items-center justify-between">
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--theme-elevation-700)]">
            {picked?.from ? dateToIso(picked.from) : activePreset ? `Preset: ${activePreset}` : "Pick a start date"}
            {picked?.to ? ` – ${dateToIso(picked.to)}` : ""}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              className="px-3 py-1 text-xs border border-[var(--theme-border-color)] rounded-[var(--style-radius-s)] text-[var(--theme-elevation-800)] hover:bg-[var(--theme-elevation-100)]"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="button"
              className="px-3 py-1 text-xs rounded-[var(--style-radius-s)] text-[var(--theme-elevation-0)] bg-[var(--theme-elevation-1000)]"
              onClick={() => {
                if (activePreset) {
                  onApply({ preset: activePreset });
                  return;
                }

                if (picked?.from && picked?.to) {
                  onApply({ from: dateToIso(picked.from), to: dateToIso(picked.to) });
                }
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
