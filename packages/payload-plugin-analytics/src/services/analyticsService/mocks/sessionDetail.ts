import type { RunReportMockFn } from "../mockRegistry";
import { pickMockRefs } from "./mockRefs";
import { row, response } from "./ga4RowBuilder";
import { pathFor } from "./pathFor";

export const sessionDetailMock: RunReportMockFn = () => {
  const { existing } = pickMockRefs();
  const ref = existing[0] ?? "__home";
  const path = pathFor(ref);

  return response([row(["page_view", path, "202606171400", "1", "", ref], ["1"]), row(["lead_action", path, "202606171401", "2", "phone_click", ref], ["1"])]) as never;
};
