import { describe, expect, it, beforeEach } from "vitest";
import { journeysMock } from "../../../../src/services/analyticsService/mocks/journeys";
import {
  setActiveExistingRefs,
  __clearActiveExistingRefs,
} from "../../../../src/services/pageFilter/activeRefsHolder";
import { MOCK_MISSING_REF } from "../../../../src/services/analyticsService/mocks/mockRefs";

describe("journeysMock (ref-tagged)", () => {
  beforeEach(() => {
    __clearActiveExistingRefs();
    setActiveExistingRefs(["pages:1"]);
  });

  it("emits rows with fr_page_ref at index 6 incl. a missing-ref session that also has a lead_action", () => {
    const res = journeysMock({} as never) as {
      rows: Array<{ dimensionValues: Array<{ value: string }> }>;
    };
    const refs = res.rows.map((r) => r.dimensionValues[6]?.value);
    expect(refs).toContain(MOCK_MISSING_REF);
    expect(refs).toContain("pages:1");
    // journeys only counts sessions containing a lead_action event
    expect(res.rows.some((r) => r.dimensionValues[1].value === "lead_action")).toBe(true);
  });
});
