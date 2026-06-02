import { useMemo } from "react";
import type { DateRange, DateRangePreset } from "../../../types/query";

const DAYS_BACK: Record<DateRangePreset, number> = {
  today: 0,
  yesterday: 1,
  "last-7d": 6,
  "last-14d": 13,
  "last-30d": 29,
  "last-90d": 89,
};

function convertFromDateToISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface UseResolvedDateRangeResult {
  from: string;
  to: string;
}

export function useResolvedDateRange(range: DateRange): UseResolvedDateRangeResult {
  return useMemo(() => {
    if ("from" in range)
      return {
        from: range.from,
        to: range.to,
      };

    const back = DAYS_BACK[range.preset] ?? 6;
    const end = new Date();
    const start = new Date(end);

    if (range.preset === "yesterday") {
      end.setUTCDate(end.getUTCDate() - 1);
      start.setUTCDate(start.getUTCDate() - 1);
    } else {
      start.setUTCDate(start.getUTCDate() - back);
    }

    return {
      from: convertFromDateToISO(start),
      to: convertFromDateToISO(end),
    };
  }, [range]);
}
