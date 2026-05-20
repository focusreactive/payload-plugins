import type { RunReportMockFn } from "../mockRegistry";
import kpisCurrent from "../../../../__fixtures__/ga4/kpis.current.json";
import kpisBoth from "../../../../__fixtures__/ga4/kpis.currentAndPrevious.json";

export const kpisMock: RunReportMockFn = (request) => {
  const hasComparison = (request.dateRanges?.length ?? 0) >= 2;

  return (hasComparison ? kpisBoth : kpisCurrent) as never;
};
