import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SessionDrawer } from "../../../../src/components/AnalyticsView/tabs/SessionDrawer";
import { LeadActionRegistryProvider } from "../../../../src/components/AnalyticsView/contexts/LeadActionRegistryContext";
import detail from "../../../../__fixtures__/admin/sessionDetail.basic.json";
import type { SessionDetailResponse, SessionsRow } from "../../../../src/types/query";

const row: SessionsRow = {
  sessionId: "8f3a2b1c5d4e6f7d12c",
  landingPage: "/",
  source: "google",
  deviceCategory: ["mobile"],
  country: ["DE"],
  startedAt: "2026-05-12T14:32:00Z",
  eventCount: 14,
  hadLeadAction: true,
};

function withProvider(node: React.ReactElement) {
  return <LeadActionRegistryProvider registry={{}}>{node}</LeadActionRegistryProvider>;
}

describe("SessionDrawer", () => {
  it("renders shortened session id, stats grid, and event timeline", () => {
    render(
      withProvider(
        <SessionDrawer row={row} detail={detail as SessionDetailResponse} onClose={() => {}} />
      )
    );
    expect(screen.getByText(/8f3a2b…/u)).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Event timeline")).toBeInTheDocument();
  });

  it("marks lead_action events as lead actions in the timeline", () => {
    const { container } = render(
      withProvider(
        <SessionDrawer row={row} detail={detail as SessionDetailResponse} onClose={() => {}} />
      )
    );
    expect(container.querySelector('[data-lead="true"]')).toBeInTheDocument();
    expect(screen.getByText(/Lead action: Phone click/u)).toBeInTheDocument();
  });

  it("invokes onClose when X clicked", () => {
    const fn = vi.fn();
    render(
      withProvider(
        <SessionDrawer row={row} detail={detail as SessionDetailResponse} onClose={fn} />
      )
    );
    fireEvent.click(screen.getByRole("button", { name: /close/iu }));
    expect(fn).toHaveBeenCalled();
  });

  it("renders SetupRequiredCard when fr_session_id missing", () => {
    render(
      withProvider(
        <SessionDrawer
          row={row}
          detail={{
            sessionId: row.sessionId,
            events: [],
            setupRequired: true,
            missing: ["fr_session_id"],
          }}
          onClose={() => {}}
        />
      )
    );
    expect(screen.getByText(/Setup required/iu)).toBeInTheDocument();
  });
});
