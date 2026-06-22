import type { BatchRunReportsMockFn } from "../mockRegistry";
import { pickMockRefs } from "./mockRefs";
import { row, response, batch } from "./ga4RowBuilder";
import { refInListFromRequest } from "./refInListFromRequest";
import { filterAndReaggregate } from "./filterAndReaggregate";

const PAGE_REF_DIM = "customEvent:fr_page_ref";
const LEAD_TYPES = ["phone_click", "email_click"];

export const leadActionsMock: BatchRunReportsMockFn = (requests) => {
  const { existing, missing } = pickMockRefs();
  const refs = [...existing, missing];

  const eventsTagged = refs.flatMap((ref) =>
    LEAD_TYPES.map((t, ti) => {
      const big = ref === missing;
      const count = big ? 44444 : 40 - ti * 10;
      return row([t, ref], [String(count), "1200"]);
    })
  );
  const eventsAllowed = refInListFromRequest(requests[0] as never, PAGE_REF_DIM);
  const eventsOut = filterAndReaggregate(eventsTagged, {
    refIndex: 1,
    keepDimIndices: [0, 1],
    allowed: eventsAllowed ? new Set(eventsAllowed) : null,
  });

  const sessionsTagged = refs.map((ref) => row([ref], [ref === missing ? "90000" : "300"]));
  const sessAllowed = refInListFromRequest(requests[1] as never, PAGE_REF_DIM);
  const sessFiltered = filterAndReaggregate(sessionsTagged, {
    refIndex: 0,
    keepDimIndices: [],
    allowed: sessAllowed ? new Set(sessAllowed) : null,
  });

  return batch([response(eventsOut), response(sessFiltered)]) as never;
};
