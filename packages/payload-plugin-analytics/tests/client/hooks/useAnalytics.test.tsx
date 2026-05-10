import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAnalytics } from "../../../src/client/hooks/useAnalytics";

describe("useAnalytics", () => {
  it("throws when called outside <AnalyticsProvider>", () => {
    expect(() => renderHook(() => useAnalytics())).toThrow(
      /useAnalytics must be used inside <AnalyticsProvider>/,
    );
  });
});
