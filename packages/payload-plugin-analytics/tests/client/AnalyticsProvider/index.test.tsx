import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsProvider as AnalyticsProviderAdapter } from "../../../src/types/provider";
import { AnalyticsProvider } from "../../../src/client/AnalyticsProvider/index";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(""),
}));

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeProvider(scriptsLabel = "ga4-mock-scripts"): AnalyticsProviderAdapter {
  return {
    name: "fake",
    Scripts: () => <div data-testid={scriptsLabel} />,
    trackEvent: vi.fn(),
    pageView: vi.fn(),
  };
}

describe("<AnalyticsProvider>", () => {
  it("renders provider.Scripts()", () => {
    const provider = makeProvider();
    const { getByTestId } = render(
      <AnalyticsProvider provider={provider}>
        <div>kid</div>
      </AnalyticsProvider>,
    );
    expect(getByTestId("ga4-mock-scripts")).toBeInTheDocument();
  });

  it("fires pageView via RouteChangeTracker on initial mount when trackRouteChanges is default", () => {
    const provider = makeProvider();
    render(
      <AnalyticsProvider provider={provider}>
        <div>kid</div>
      </AnalyticsProvider>,
    );
    expect(provider.pageView).toHaveBeenCalled();
  });

  it("does NOT fire pageView when trackRouteChanges is false", () => {
    const provider = makeProvider();
    render(
      <AnalyticsProvider provider={provider} trackRouteChanges={false}>
        <div>kid</div>
      </AnalyticsProvider>,
    );
    expect(provider.pageView).not.toHaveBeenCalled();
  });

  it("installs phone-click listener (default on); fires on tel: anchor", () => {
    const provider = makeProvider();
    render(
      <AnalyticsProvider provider={provider}>
        <a id="phone" href="tel:+1">
          call
        </a>
      </AnalyticsProvider>,
    );
    document.getElementById("phone")!.click();
    expect(provider.trackEvent).toHaveBeenCalledWith("phone_click", expect.any(Object));
  });

  it("does NOT install phone-click when phoneClicks=false", () => {
    const provider = makeProvider();
    render(
      <AnalyticsProvider provider={provider} autoTrackLeadActions={{ phoneClicks: false }}>
        <a id="phone" href="tel:+1">
          call
        </a>
      </AnalyticsProvider>,
    );
    document.getElementById("phone")!.click();
    const trackCalls = (provider.trackEvent as ReturnType<typeof vi.fn>).mock.calls;
    expect(trackCalls.find((c) => c[0] === "phone_click")).toBeUndefined();
  });

  it("warns in dev when nested inside another <AnalyticsProvider>", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const outer = makeProvider("outer");
    const inner = makeProvider("inner");
    render(
      <AnalyticsProvider provider={outer}>
        <AnalyticsProvider provider={inner}>
          <div>kid</div>
        </AnalyticsProvider>
      </AnalyticsProvider>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Nested <AnalyticsProvider>"));
  });
});
