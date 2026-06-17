import { describe, expect, it, beforeEach } from "vitest";
import { leadActionsMock } from "../../../../src/services/analyticsService/mocks/leadActions";
import { setActiveExistingRefs, __clearActiveExistingRefs } from "../../../../src/services/pageFilter/activeRefsHolder";

// The leadActions mock is now a filter-aware generator (see leadActions.mock.test.ts
// for the filtering behavior). This file keeps the structural batch-shape contract.
describe("leadActionsMock", () => {
  beforeEach(() => {
    __clearActiveExistingRefs();
    setActiveExistingRefs(["pages:1"]);
  });

  it("has two reports in the batch (events + sessions)", async () => {
    const result = await leadActionsMock([{ dateRanges: [{ startDate: "2026-05-04", endDate: "2026-05-06" }] }, { dateRanges: [{ startDate: "2026-05-04", endDate: "2026-05-06" }] }]);
    expect(result.reports).toHaveLength(2);
  });
});
