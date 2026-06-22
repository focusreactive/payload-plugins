"use client";

import { DateRangeDropdown } from "./DateRangeDropdown";
import { ComparisonDropdown } from "./ComparisonDropdown";
import type { DateRange, Comparison } from "../../../types/query";
import { cn } from "../../../utils/style";

export interface FilterBarProps {
  className?: string;
  dateRange: DateRange;
  onDateRangeChange: (next: DateRange) => void;
  comparison: Comparison;
  onComparisonChange: (next: Comparison) => void;
}

export function FilterBar({
  className,
  dateRange,
  onDateRangeChange,
  comparison,
  onComparisonChange,
}: FilterBarProps) {
  return (
    <div className={cn("flex gap-2 items-center", className)}>
      <DateRangeDropdown value={dateRange} onChange={onDateRangeChange} />
      <ComparisonDropdown value={comparison} onChange={onComparisonChange} />
    </div>
  );
}
