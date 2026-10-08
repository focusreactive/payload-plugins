import { describe, expect, it } from "vitest";

import { isLastAttempt } from "../isLastAttempt.js";

describe("isLastAttempt", () => {
  it.each([
    [0, 3, false],
    [1, 3, false],
    [2, 3, false],
    [3, 3, true],
    [4, 3, true],
  ])("with %i attempts behind it and a limit of %i, says %s", (before, limit, expected) => {
    expect(isLastAttempt({ totalTried: before }, limit)).toBe(expected);
  });

  it("treats a locale with no record as being on its first attempt", () => {
    expect(
      isLastAttempt(undefined, 1),
      "zero attempts behind it, limit one — one more to come"
    ).toBe(false);
  });

  it("treats a record that does not count as no attempts", () => {
    expect(isLastAttempt({}, 1)).toBe(false);
  });

  it("says yes on the first failure when the run was told not to retry", () => {
    expect(isLastAttempt(undefined, 0), "a limit of zero leaves nothing to come").toBe(true);
  });
});
