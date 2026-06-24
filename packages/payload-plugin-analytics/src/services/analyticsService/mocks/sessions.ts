import type { BatchRunReportsMockFn } from "../mockRegistry";
import { pickMockRefs } from "./mockRefs";
import { row, response, batch } from "./ga4RowBuilder";
import { pathFor } from "./pathFor";

export const sessionsMock: BatchRunReportsMockFn = () => {
  const { existing, missing } = pickMockRefs();
  const refs = [...existing, missing];

  const rows = refs.map((ref, i) => {
    const big = ref === missing;
    const sid = `s${i}`;
    return row(
      [sid, pathFor(ref), "google", "desktop", "United States", "2026-06-17T14:00:00.000Z", ref],
      [big ? "9999" : "12"]
    );
  });

  const leadRows = refs.slice(0, 1).map((_ref, i) => row([`s${i}`], ["3"]));

  return batch([response(rows), response(leadRows)]) as never;
};
