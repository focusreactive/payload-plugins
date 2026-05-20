import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SessionDrawer } from "../../../../src/components/AnalyticsView/tabs/SessionDrawer";
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

describe("SessionDrawer", () => {
  it("renders shortened session id, stats grid, and event timeline", () => {
    render(<SessionDrawer row={row} detail={detail as SessionDetailResponse} onClose={() => {}} />);
    expect(screen.getByText(/8f3a2b…/)).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Event timeline")).toBeInTheDocument();
  });

  it("invokes onClose when X clicked", () => {
    const fn = vi.fn();
    render(<SessionDrawer row={row} detail={detail as SessionDetailResponse} onClose={fn} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(fn).toHaveBeenCalled();
  });

  it("renders SetupRequiredCard when fr_session_id missing", () => {
    render(
      <SessionDrawer
        row={row}
        detail={{
          sessionId: row.sessionId,
          events: [],
          setupRequired: true,
          missing: ["fr_session_id"],
        }}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/Setup required/i)).toBeInTheDocument();
  });
});
