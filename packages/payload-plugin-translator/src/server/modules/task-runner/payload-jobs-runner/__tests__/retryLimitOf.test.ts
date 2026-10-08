import { describe, expect, it } from "vitest";

import { retryLimitOf } from "../retryLimitOf.js";

describe("retryLimitOf", () => {
  it.each([
    ["a bare number", 3, 3],
    ["a config object", { attempts: 2 }, 2],
    ["a config object carrying only a backoff", { backoff: { type: "fixed" as const } }, 0],
    ["nothing configured", undefined, 0],
  ])("reads %s", (_label, retries, expected) => {
    expect(retryLimitOf(retries as never)).toBe(expected);
  });
});
