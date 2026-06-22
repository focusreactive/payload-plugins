import type { RunReportMockFn } from "../mockRegistry";
import { pickMockRefs } from "./mockRefs";
import { row, response } from "./ga4RowBuilder";
import { refInListFromRequest } from "./refInListFromRequest";
import { filterAndReaggregate } from "./filterAndReaggregate";

const PAGE_REF_DIM = "customEvent:fr_page_ref";
const DEVICES = [
  ["desktop", "Chrome", "macOS"],
  ["mobile", "Safari", "iOS"],
];

export const topDevicesMock: RunReportMockFn = (request) => {
  const { existing, missing } = pickMockRefs();
  const refs = [...existing, missing];
  const tagged = refs.flatMap((ref) =>
    DEVICES.map((d, di) => {
      const big = ref === missing;
      const sessions = big ? 77777 : 150 - di * 40;
      return row([...d, ref], [String(sessions), String(Math.round(sessions * 0.8))]);
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
