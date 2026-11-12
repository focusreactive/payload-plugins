import { afterEach, describe, expect, it, vi } from "vitest";
import { stampOperationStart } from "../../src/core/operationClock";

describe("stampOperationStart", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stamps an operation with the time it starts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
    expect(stampOperationStart()).toBe("2030-01-01T00:00:00.000Z");
  });

  it("stamps operations that start within the same millisecond in the order they start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-02T00:00:00.000Z"));
    const stamps = [stampOperationStart(), stampOperationStart(), stampOperationStart()];
    expect(stamps).toEqual([
      "2030-01-02T00:00:00.000Z",
      "2030-01-02T00:00:00.001Z",
      "2030-01-02T00:00:00.002Z",
    ]);
  });
});
