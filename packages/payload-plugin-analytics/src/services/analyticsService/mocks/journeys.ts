import type { RunReportMockFn } from "../mockRegistry";
import { pickMockRefs } from "./mockRefs";
import { row, response } from "./ga4RowBuilder";
import { pathFor } from "./pathFor";

export const journeysMock: RunReportMockFn = () => {
  const { existing, missing } = pickMockRefs();
  const refs = [...existing, missing];

  return response(
    refs.flatMap((ref, i) => {
      const sid = `s${i}`;
      const p = pathFor(ref);
      return [row([sid, "page_view", p, "202606171400", "1", "", ref], ["1"]), row([sid, "lead_action", p, "202606171401", "2", "phone_click", ref], ["1"])];
    })
  ) as never;
};
