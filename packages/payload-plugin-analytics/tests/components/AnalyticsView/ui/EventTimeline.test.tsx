import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventTimeline } from "../../../../src/components/AnalyticsView/ui/EventTimeline";

describe("EventTimeline", () => {
  it("renders rows with timestamps and lead-action highlight", () => {
    const { container } = render(
      <EventTimeline
        events={[
          { timestamp: "14:32", eventName: "session_start", pagePath: "/", params: { source: "google" } },
          { timestamp: "14:36", eventName: "phone_click", isLeadAction: true },
        ]}
      />,
    );
    expect(screen.getByText("session_start")).toBeInTheDocument();
    expect(container.querySelector('[data-lead="true"]')).toBeInTheDocument();
  });
});
