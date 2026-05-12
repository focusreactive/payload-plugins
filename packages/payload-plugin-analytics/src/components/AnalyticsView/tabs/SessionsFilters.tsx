"use client";

import type { ReactNode } from "react";
import { Zap, X, Filter, ChevronDown, Check } from "lucide-react";
import { Dropdown } from "../ui/Dropdown";
import { getDeviceIcon } from "../icons";
import { cn } from "../../../utils/style";
import type { DeviceCategory } from "../../../types/query";
import type { SessionsFilters as Filters } from "../hooks/useAnalyticsParams";

const DEVICE_OPTIONS: DeviceCategory[] = ["desktop", "mobile", "tablet", "other"];

interface SingleSelectProps {
  label: string;
  value: string | undefined;
  options: string[];
  onChange: (next: string | undefined) => void;
  renderOption?: (opt: string) => ReactNode;
}

function SingleSelect({ label, value, options, onChange, renderOption }: SingleSelectProps) {
  return (
    <Dropdown
      trigger={
        <>
          <Filter size={12} />

          <span className="font-medium">
            {label}
            {value ? `: ${value}` : ""}
          </span>

          <ChevronDown size={12} className="text-[var(--theme-elevation-500)]" />
        </>
      }>
      {(close) => (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--theme-elevation-500)] px-2.5 pt-1.5 pb-1">
            {label}
          </div>

          <div
            role="button"
            className="flex justify-between items-center px-2.5 py-1.5 text-sm rounded-[var(--style-radius-s)] cursor-pointer hover:bg-[var(--theme-elevation-100)]"
            onClick={() => {
              onChange(undefined);
              close();
            }}>
            <span className="text-[var(--theme-elevation-500)]">Any</span>

            {value == null && <Check size={13} className="text-[var(--theme-elevation-1000)]" />}
          </div>

          {options.map((opt) => (
            <div
              key={opt}
              role="button"
              className="flex justify-between items-center px-2.5 py-1.5 text-sm rounded-[var(--style-radius-s)] cursor-pointer hover:bg-[var(--theme-elevation-100)]"
              onClick={() => {
                onChange(opt);
                close();
              }}>
              {renderOption ? renderOption(opt) : <span>{opt}</span>}

              {value === opt && <Check size={13} className="text-[var(--theme-elevation-1000)]" />}
            </div>
          ))}
        </>
      )}
    </Dropdown>
  );
}

export interface SessionsFiltersProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  sourceOptions: string[];
  countryOptions: string[];
}

export function SessionsFilters({ filters, onChange, sourceOptions, countryOptions }: SessionsFiltersProps) {
  return (
    <div className="flex gap-2 items-center pb-3.5">
      <button
        type="button"
        data-on={filters.hadLeadAction ? "true" : undefined}
        onClick={() => onChange({ hadLeadAction: !filters.hadLeadAction })}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-[var(--style-radius-s)] border",
          filters.hadLeadAction ?
            "bg-[var(--theme-success-50)] text-[var(--theme-success-700)] border-[var(--theme-success-200)]"
          : "bg-[var(--theme-elevation-0)] text-[var(--theme-elevation-700)] border-[var(--theme-border-color)] hover:bg-[var(--theme-elevation-50)]",
        )}>
        <Zap size={12} /> Had lead action {filters.hadLeadAction && <X size={11} />}
      </button>

      <SingleSelect
        label="Source"
        value={filters.source}
        options={sourceOptions}
        onChange={(v) => onChange({ source: v ?? undefined })}
      />

      <SingleSelect
        label="Device"
        value={filters.device}
        options={DEVICE_OPTIONS}
        onChange={(v) => onChange({ device: (v as DeviceCategory) ?? undefined })}
        renderOption={(opt) => {
          const Icon = getDeviceIcon(opt as DeviceCategory);

          return (
            <span className="inline-flex items-center gap-1.5">
              <Icon size={12} />
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </span>
          );
        }}
      />

      <SingleSelect
        label="Country"
        value={filters.country}
        options={countryOptions}
        onChange={(v) => onChange({ country: v ?? undefined })}
      />
    </div>
  );
}
