import type { RunReportMockFn } from "../mockRegistry";
import { pickMockRefs } from "./mockRefs";
import { row, response } from "./ga4RowBuilder";

export const kpisMock: RunReportMockFn = (request) => {
  const { existing, missing } = pickMockRefs();
  const refs = [...existing, missing];
  const date = "20260617";
  const hasComparison = (request.dateRanges?.length ?? 0) >= 2;

  const buildRows = (rangeName: "current" | "previous") =>
    refs.flatMap((ref, i) => {
      const sid = `${rangeName}-s${i}`;
      const big = ref === missing;
      const baseMinute = 1400;
      const pvCount = big ? 50 : 3;
      return Array.from({ length: pvCount }, (_, k) => {
        const dhm = `${date}${String(baseMinute + k).padStart(4, "0")}`;
        const dims = [sid, date, ref, "page_view", dhm];
        return row(hasComparison ? [...dims, rangeName] : dims, ["1"]);
      });
    });

  const rows = hasComparison ? [...buildRows("current"), ...buildRows("previous")] : buildRows("current");
  return response(rows) as never;
};
