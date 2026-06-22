import type { RunReportMockFn } from "../mockRegistry";
import { pickMockRefs } from "./mockRefs";
import { row, response } from "./ga4RowBuilder";
import { refInListFromRequest } from "./refInListFromRequest";
import { filterAndReaggregate } from "./filterAndReaggregate";

const PAGE_REF_DIM = "customEvent:fr_page_ref";
const EVENTS = ["page_view", "scroll", "click"];

export const topEventsMock: RunReportMockFn = (request) => {
  const { existing, missing } = pickMockRefs();
  const refs = [...existing, missing];
  const tagged = refs.flatMap((ref) =>
    EVENTS.map((e, ei) => {
      const big = ref === missing;
      const count = big ? 55555 : 300 - ei * 90;
      return row([e, ref], [String(count), "1.5"]);
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
