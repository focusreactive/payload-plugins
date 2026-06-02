import { convertDateToISO } from "./convertDateToISO";
import { convertISOToDate } from "./convertISOToDate";
import { shiftDateByDays } from "./shiftDateByDays";
import type { ResolvedDateRange } from "./types";

export function resolveComparison(current: ResolvedDateRange): ResolvedDateRange {
  const start = convertISOToDate(current.startDate);
  const end = convertISOToDate(current.endDate);
  const lengthDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  const prevEnd = shiftDateByDays(start, -1);
  const prevStart = shiftDateByDays(prevEnd, -(lengthDays - 1));

  return {
    startDate: convertDateToISO(prevStart),
    endDate: convertDateToISO(prevEnd),
  };
}
