import type { ResolvedDateRange } from "../date/types";

export interface NamedDateRange extends ResolvedDateRange {
  name: string;
}

export function dateRangesFor(current: ResolvedDateRange, previous?: ResolvedDateRange): NamedDateRange[] {
  if (!previous) return [{ ...current, name: "current" }];

  return [
    { ...current, name: "current" },
    { ...previous, name: "previous" },
  ];
}
