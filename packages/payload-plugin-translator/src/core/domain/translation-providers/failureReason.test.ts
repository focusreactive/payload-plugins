import { describe, expect, it } from "vitest";

import type { UserFacingFailureReason } from "./failureReason";
import { markFailureReason, readFailureReason } from "./failureReason";

const REASONS: UserFacingFailureReason[] = ["model-unavailable"];

describe("markFailureReason / readFailureReason", () => {
  for (const reason of REASONS) {
    it(`round-trips "${reason}"`, () => {
      expect(readFailureReason(markFailureReason(reason, "some detail"))).toBe(reason);
    });
  }

  it("keeps the detail in the message it produces", () => {
    expect(markFailureReason("model-unavailable", "the model gpt-x is unavailable")).toContain(
      "the model gpt-x is unavailable"
    );
  });

  it("reads back null from an unmarked message", () => {
    expect(readFailureReason("429 rate limit exceeded")).toBeNull();
  });

  it("reads back null when the marker is not at the start", () => {
    const marked = markFailureReason("model-unavailable", "detail");
    expect(readFailureReason(`429 rate limit exceeded — ${marked}`)).toBeNull();
  });

  it("reads back null for a marker naming a reason that does not exist", () => {
    const marked = markFailureReason("model-unavailable", "detail");
    expect(readFailureReason(marked.replace("model-unavailable", "not-a-real-reason"))).toBeNull();
  });

  it("reads back null from an empty message", () => {
    expect(readFailureReason("")).toBeNull();
  });
});
