import type { RunReportMockFn } from "../mockRegistry";
import { pickMockRefs } from "./mockRefs";
import { row, response } from "./ga4RowBuilder";
import { refInListFromRequest } from "./refInListFromRequest";
import { filterAndReaggregate } from "./filterAndReaggregate";

const PAGE_REF_DIM = "customEvent:fr_page_ref";

export const topPagesMock: RunReportMockFn = (request) => {
  const { existing, missing } = pickMockRefs();
  const refs = [...existing, missing];

  const tagged = refs.map((ref, i) => {
    const isMissing = ref === missing;
    const views = isMissing ? 99999 : 500 - i * 80;
    return row([ref], [String(views), String(Math.round(views * 0.7)), "75.0"]);
  });

  const allowedList = refInListFromRequest(request as never, PAGE_REF_DIM);
  const allowed = allowedList ? new Set(allowedList) : null;

  const out = filterAndReaggregate(tagged, { refIndex: 0, keepDimIndices: [0], allowed });
  return response(out) as never;
};
