import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { TrackLeadAction } from "../../../src/client/Track/TrackLeadAction";
import { AnalyticsContext } from "../../../src/client/AnalyticsProvider/AnalyticsContext";
import type { AnalyticsProvider } from "../../../src/types/provider";

function buildProvider(): AnalyticsProvider {
  return {
    name: "test",
    Scripts: () => null,
    trackEvent: vi.fn(),
    pageView: vi.fn(),
  };
}

describe("<TrackLeadAction>", () => {
  it("fires lead_action with fr_lead_type on click", () => {
    const provider = buildProvider();
    const { getByRole } = render(
      <AnalyticsContext.Provider value={{ provider }}>
        <TrackLeadAction on="click" type="cta_pricing_click" payload={{ surface: "header" }}>
          <button>Buy</button>
        </TrackLeadAction>
      </AnalyticsContext.Provider>
    );

    fireEvent.click(getByRole("button"));

    expect(provider.trackEvent).toHaveBeenCalledWith("lead_action", {
      fr_lead_type: "cta_pricing_click",
      surface: "header",
    });
  });

  it("fires on submit", () => {
    const provider = buildProvider();
    const { getByRole } = render(
      <AnalyticsContext.Provider value={{ provider }}>
        <TrackLeadAction on="submit" type="form_submit">
          <form aria-label="contact">
            <button type="submit">Send</button>
          </form>
        </TrackLeadAction>
      </AnalyticsContext.Provider>
    );

    fireEvent.submit(getByRole("form"));

    expect(provider.trackEvent).toHaveBeenCalledWith("lead_action", {
      fr_lead_type: "form_submit",
    });
  });
});
