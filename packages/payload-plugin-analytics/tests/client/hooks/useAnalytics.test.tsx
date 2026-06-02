import { render, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAnalytics } from "../../../src/client/hooks/useAnalytics";
import { AnalyticsContext } from "../../../src/client/AnalyticsProvider/AnalyticsContext";
import type { AnalyticsProvider } from "../../../src/types/provider";

describe("useAnalytics", () => {
  it("throws when called outside <AnalyticsProvider>", () => {
    expect(() => renderHook(() => useAnalytics())).toThrow(/useAnalytics must be used inside <AnalyticsProvider>/u);
  });
});

function buildProvider(): AnalyticsProvider {
  return {
    name: "test",
    Scripts: () => null,
    trackEvent: vi.fn(),
    pageView: vi.fn(),
  };
}

function HarnessCall({ onReady }: { onReady: (api: ReturnType<typeof useAnalytics>) => void }) {
  const api = useAnalytics();
  onReady(api);
  return null;
}

describe("useAnalytics.trackLeadAction", () => {
  it("fires lead_action with fr_lead_type and merged payload", () => {
    const provider = buildProvider();
    let api: ReturnType<typeof useAnalytics> | undefined;
    render(
      <AnalyticsContext.Provider value={{ provider }}>
        <HarnessCall onReady={(a) => (api = a)} />
      </AnalyticsContext.Provider>
    );

    api!.trackLeadAction("cta_pricing_click", { page_path: "/pricing" });

    expect(provider.trackEvent).toHaveBeenCalledWith("lead_action", {
      fr_lead_type: "cta_pricing_click",
      page_path: "/pricing",
    });
  });

  it("payload may omit fields and trackLeadAction still attaches fr_lead_type", () => {
    const provider = buildProvider();
    let api: ReturnType<typeof useAnalytics> | undefined;
    render(
      <AnalyticsContext.Provider value={{ provider }}>
        <HarnessCall onReady={(a) => (api = a)} />
      </AnalyticsContext.Provider>
    );

    api!.trackLeadAction("phone_click");
    expect(provider.trackEvent).toHaveBeenCalledWith("lead_action", { fr_lead_type: "phone_click" });
  });
});
