import type { RunReportMockFn } from "../mockRegistry";
import { pickMockRefs } from "./mockRefs";
import { row, response } from "./ga4RowBuilder";
import { refInListFromRequest } from "./refInListFromRequest";
import { filterAndReaggregate } from "./filterAndReaggregate";

const PAGE_REF_DIM = "customEvent:fr_page_ref";
const COUNTRIES = [["United States"], ["Germany"]];

export const topCountriesMock: RunReportMockFn = (request) => {
  const { existing, missing } = pickMockRefs();
  const refs = [...existing, missing];
  const tagged = refs.flatMap((ref) =>
    COUNTRIES.map((c, ci) => {
      const big = ref === missing;
      const sessions = big ? 66666 : 120 - ci * 30;
      return row([...c, ref], [String(sessions), String(Math.round(sessions * 0.8))]);
    })
  );
  const allowedList = refInListFromRequest(request as never, PAGE_REF_DIM);
  const out = filterAndReaggregate(tagged, {
    refIndex: 1,
    keepDimIndices: [0],
    allowed: allowedList ? new Set(allowedList) : null,
  });
  return response(out) as never;
};
