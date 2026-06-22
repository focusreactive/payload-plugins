import { describe, expect, it, beforeEach } from "vitest";
import { sessionsMock } from "../../../../src/services/analyticsService/mocks/sessions";
import {
  setActiveExistingRefs,
  __clearActiveExistingRefs,
} from "../../../../src/services/pageFilter/activeRefsHolder";
import { MOCK_MISSING_REF } from "../../../../src/services/analyticsService/mocks/mockRefs";

type BatchRes = { reports: Array<{ rows: Array<{ dimensionValues: Array<{ value: string }> }> }> };

describe("sessionsMock (ref-tagged session rows)", () => {
  beforeEach(() => {
    __clearActiveExistingRefs();
    setActiveExistingRefs(["pages:1"]);
  });

  it("report[0] rows carry fr_page_ref at index 6 incl. a missing-ref session", () => {
    const res = sessionsMock([{}, {}] as never) as BatchRes;
    const refsAtIdx6 = res.reports[0].rows.map((r) => r.dimensionValues[6]?.value);
    expect(refsAtIdx6).toContain(MOCK_MISSING_REF);
    expect(refsAtIdx6).toContain("pages:1");
  });
});
