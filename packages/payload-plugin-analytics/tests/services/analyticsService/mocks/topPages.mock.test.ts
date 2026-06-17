import { describe, expect, it, beforeEach } from "vitest";
import { topPagesMock } from "../../../../src/services/analyticsService/mocks/topPages";
import { setActiveExistingRefs, __clearActiveExistingRefs } from "../../../../src/services/pageFilter/activeRefsHolder";
import { MOCK_MISSING_REF } from "../../../../src/services/analyticsService/mocks/mockRefs";

const DIM = "customEvent:fr_page_ref";

describe("topPagesMock (filter-aware, ref-grouped)", () => {
  beforeEach(() => {
    __clearActiveExistingRefs();
    setActiveExistingRefs(["pages:1"]);
  });

  it("excludes the missing page ref when the request filters by existing refs", () => {
    const req = { dimensionFilter: { filter: { fieldName: DIM, inListFilter: { values: ["pages:1"] } } } };
    const res = topPagesMock(req as never) as { rows: Array<{ dimensionValues: Array<{ value: string }> }> };
    const refs = res.rows.map((r) => r.dimensionValues[0].value);
    expect(refs).not.toContain(MOCK_MISSING_REF);
    expect(refs.length).toBeGreaterThan(0);
  });

  it("the generator DID emit the missing page ref (so the filter, not omission, hides it)", () => {
    // No filter on the request → missing ref present, proving it exists in mock data.
    const res = topPagesMock({} as never) as { rows: Array<{ dimensionValues: Array<{ value: string }> }> };
    const refs = res.rows.map((r) => r.dimensionValues[0].value);
    expect(refs).toContain(MOCK_MISSING_REF);
  });
});
