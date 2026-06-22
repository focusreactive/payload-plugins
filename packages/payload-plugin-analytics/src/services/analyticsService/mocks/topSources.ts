import type { RunReportMockFn } from "../mockRegistry";
import { pickMockRefs } from "./mockRefs";
import { row, response } from "./ga4RowBuilder";
import { refInListFromRequest } from "./refInListFromRequest";
import { filterAndReaggregate } from "./filterAndReaggregate";

const PAGE_REF_DIM = "customEvent:fr_page_ref";
const SOURCES = [
  ["google", "organic", "Organic Search"],
  ["direct", "(none)", "Direct"],
];

export const topSourcesMock: RunReportMockFn = (request) => {
  const { existing, missing } = pickMockRefs();
  const refs = [...existing, missing];
  const tagged = refs.flatMap((ref) =>
    SOURCES.map((s, si) => {
      const big = ref === missing;
      const sessions = big ? 88888 : 200 - si * 50;
      return row([...s, ref], [String(sessions), String(Math.round(sessions * 0.8))]);
    })
  );
  const allowedList = refInListFromRequest(request as never, PAGE_REF_DIM);
  const out = filterAndReaggregate(tagged, {
    refIndex: 3,
    keepDimIndices: [0, 1, 2],
    allowed: allowedList ? new Set(allowedList) : null,
  });
  return response(out) as never;
};
