import { describe, it, expect } from "vitest";
import { isValidTransition } from "../../validation/statusTransitions";
import type { ReleaseStatus } from "../../types";

describe("isValidTransition", () => {
  const validCases: Array<[ReleaseStatus, ReleaseStatus]> = [
    ["draft", "scheduled"],
    ["draft", "publishing"],
    ["draft", "cancelled"],
    ["scheduled", "draft"],
    ["scheduled", "publishing"],
    ["publishing", "published"],
    ["publishing", "failed"],
    ["failed", "draft"],
    ["cancelled", "publishing"],
    ["reverted", "draft"],
  ];

  const invalidCases: Array<[ReleaseStatus, ReleaseStatus]> = [
    ["published", "draft"],
    ["published", "cancelled"],
    ["cancelled", "draft"],
    ["publishing", "cancelled"],
    ["draft", "published"],
    ["draft", "failed"],
    ["scheduled", "published"],
  ];

  it.each(validCases)("should allow transition from %s to %s", (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });

  it.each(invalidCases)("should reject transition from %s to %s", (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });

  it("should reject same-state transitions", () => {
    expect(isValidTransition("draft", "draft")).toBe(false);
  });
});
