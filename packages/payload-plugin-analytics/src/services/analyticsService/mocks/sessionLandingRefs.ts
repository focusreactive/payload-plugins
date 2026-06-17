import type { RunReportMockFn } from "../mockRegistry";
import { pickMockRefs } from "./mockRefs";
import { row, response } from "./ga4RowBuilder";

export const sessionLandingRefsMock: RunReportMockFn = () => {
  const { existing, missing } = pickMockRefs();
  const refs = [...existing, missing];

  const rows = refs.map((ref, i) => row([`s${i}`, ref, "202606171400", "1"], ["1"]));

  return response(rows) as never;
};
