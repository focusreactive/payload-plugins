import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventTimeline } from "../../../../src/components/AnalyticsView/ui/EventTimeline";
import { LeadActionRegistryProvider } from "../../../../src/components/AnalyticsView/contexts/LeadActionRegistryContext";

describe("EventTimeline", () => {
  it("renders rows with timestamps and lead-action highlight", () => {
    const { container } = render(
      <LeadActionRegistryProvider registry={{}}>
        <EventTimeline
          events={[
            {
              timestamp: "14:32",
              eventName: "session_start",
              pagePath: "/",
              params: { source: "google" },
            },
            {
              timestamp: "14:36",
              eventName: "lead_action",
              isLeadAction: true,
              params: { fr_lead_type: "phone_click" },
            },
          ]}
        />
      </LeadActionRegistryProvider>
    );
    expect(screen.getByText("session_start")).toBeInTheDocument();
    expect(container.querySelector('[data-lead="true"]')).toBeInTheDocument();
    expect(screen.getByText("Lead action: Phone click")).toBeInTheDocument();
  });
});
