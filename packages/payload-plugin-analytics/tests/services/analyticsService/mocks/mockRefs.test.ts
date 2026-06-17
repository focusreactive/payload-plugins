// tests/services/analyticsService/mocks/mockRefs.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { pickMockRefs, MOCK_MISSING_REF } from "../../../../src/services/analyticsService/mocks/mockRefs";
import { setActiveExistingRefs, __clearActiveExistingRefs } from "../../../../src/services/pageFilter/activeRefsHolder";

describe("pickMockRefs", () => {
  beforeEach(() => __clearActiveExistingRefs());

  it("uses up to 3 live existing refs + the fabricated missing ref", () => {
    setActiveExistingRefs(["__home", "pages:1", "pages:2", "pages:3", "pages:4"]);
    const { existing, missing } = pickMockRefs();
    expect(existing).toEqual(["__home", "pages:1", "pages:2"]);
    expect(missing).toBe(MOCK_MISSING_REF);
    expect(existing).not.toContain(MOCK_MISSING_REF);
  });

  it("falls back to a synthetic existing ref when the holder is empty", () => {
    const { existing, missing } = pickMockRefs();
    expect(existing).toEqual(["__home"]);
    expect(missing).toBe(MOCK_MISSING_REF);
  });

  it("the missing ref is an obviously-fake sentinel that cannot collide with a real id", () => {
    expect(MOCK_MISSING_REF).toBe("pages:__mock_deleted__");
  });
});
