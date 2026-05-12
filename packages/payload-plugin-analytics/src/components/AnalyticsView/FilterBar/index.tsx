"use client";

import { DateRangeDropdown } from "./DateRangeDropdown";
import { ComparisonDropdown } from "./ComparisonDropdown";
import type { DateRange, Comparison } from "../../../types/query";

export interface FilterBarProps {
  dateRange: DateRange;
  onDateRangeChange: (next: DateRange) => void;
  comparison: Comparison;
  onComparisonChange: (next: Comparison) => void;
}

export function FilterBar({ dateRange, onDateRangeChange, comparison, onComparisonChange }: FilterBarProps) {
  return (
    <div className="flex gap-2 items-center">
      <DateRangeDropdown value={dateRange} onChange={onDateRangeChange} />
      <ComparisonDropdown value={comparison} onChange={onComparisonChange} />
    </div>
  );
}
