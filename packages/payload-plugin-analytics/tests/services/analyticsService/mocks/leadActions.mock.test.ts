import { describe, expect, it, beforeEach } from "vitest";
import { leadActionsMock } from "../../../../src/services/analyticsService/mocks/leadActions";
import { setActiveExistingRefs, __clearActiveExistingRefs } from "../../../../src/services/pageFilter/activeRefsHolder";
import { MOCK_MISSING_REF } from "../../../../src/services/analyticsService/mocks/mockRefs";

const DIM = "customEvent:fr_page_ref";
const filt = { filter: { fieldName: DIM, inListFilter: { values: ["pages:1"] } } };
const eventsReq = { dimensionFilter: { andGroup: { expressions: [{ filter: { fieldName: "eventName", stringFilter: { value: "lead_action" } } }, filt] } } };
const sessionsReq = { dimensionFilter: filt };

type BatchRes = { reports: Array<{ rows: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }> }> };

describe("leadActionsMock (filter-aware, ref-grouped)", () => {
  beforeEach(() => {
    __clearActiveExistingRefs();
    setActiveExistingRefs(["pages:1"]);
  });

  it("the events report (report[0]) carries the ref at dim index 1 and excludes the missing ref under filter", () => {
    const res = leadActionsMock([eventsReq, sessionsReq] as never) as BatchRes;
    const refs = res.reports[0].rows.map((r) => r.dimensionValues[1].value);
    expect(refs).not.toContain(MOCK_MISSING_REF);
    expect(refs.length).toBeGreaterThan(0);
  });

  it("the events report DID emit the missing ref when unfiltered", () => {
    const res = leadActionsMock([{}, {}] as never) as BatchRes;
    const refs = res.reports[0].rows.map((r) => r.dimensionValues[1].value);
    expect(refs).toContain(MOCK_MISSING_REF);
  });

  it("the sessions denominator (report[1]) shrinks under filter (no missing-page sessions)", () => {
    const filteredTotal = Number((leadActionsMock([eventsReq, sessionsReq] as never) as BatchRes).reports[1].rows[0].metricValues[0].value);
    const unfilteredTotal = Number((leadActionsMock([{}, {}] as never) as BatchRes).reports[1].rows[0].metricValues[0].value);
    expect(filteredTotal).toBeLessThan(unfilteredTotal);
  });
});
