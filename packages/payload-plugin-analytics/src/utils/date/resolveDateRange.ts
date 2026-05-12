import type { DateRange } from "../../types/query";
import { convertDateToISO } from "./convertDateToISO";
import { shiftDateByDays } from "./shiftDateByDays";
import type { ResolvedDateRange } from "./types";

export function resolveDateRange(range: DateRange): ResolvedDateRange {
  if ("from" in range) return { startDate: range.from, endDate: range.to };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const todayPresetDateRange: ResolvedDateRange = {
    startDate: convertDateToISO(today),
    endDate: convertDateToISO(today),
  };

  switch (range.preset) {
    case "today":
      return todayPresetDateRange;
    case "yesterday":
      return {
        startDate: convertDateToISO(shiftDateByDays(today, -1)),
        endDate: convertDateToISO(shiftDateByDays(today, -1)),
      };
    case "last-7d":
      return {
        startDate: convertDateToISO(shiftDateByDays(today, -6)),
        endDate: convertDateToISO(today),
      };
    case "last-30d":
      return {
        startDate: convertDateToISO(shiftDateByDays(today, -29)),
        endDate: convertDateToISO(today),
      };
    case "last-90d":
      return {
        startDate: convertDateToISO(shiftDateByDays(today, -89)),
        endDate: convertDateToISO(today),
      };
    default: {
      return todayPresetDateRange;
    }
  }
}
