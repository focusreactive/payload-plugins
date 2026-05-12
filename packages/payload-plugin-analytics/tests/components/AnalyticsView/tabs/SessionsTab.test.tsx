import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SessionsTab } from "../../../../src/components/AnalyticsView/tabs/SessionsTab";
import sessions from "../../../../__fixtures__/admin/sessions.basic.json";
import type { SessionsResponse } from "../../../../src/types/query";

describe("SessionsTab", () => {
  it("renders caveat banner, filters, and table rows", () => {
    render(<SessionsTab filters={{}} onFiltersChange={() => {}} sessions={sessions as SessionsResponse} />);
    expect(screen.getByText(/Times shown at minute precision/i)).toBeInTheDocument();
    expect(screen.getByText("Landing page")).toBeInTheDocument();
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
  });

  it("replaces table with SetupRequiredCard when setupRequired", () => {
    render(
      <SessionsTab
        filters={{}}
        onFiltersChange={() => {}}
        sessions={
          {
            rows: [],
            pagination: { cursor: null, hasMore: false },
            setupRequired: true,
            missing: ["fr_session_id"],
          } as SessionsResponse
        }
      />,
    );
    expect(screen.getByText(/Setup required/i)).toBeInTheDocument();
  });

  it("opens the drawer when a row is clicked", () => {
    render(<SessionsTab filters={{}} onFiltersChange={() => {}} sessions={sessions as SessionsResponse} />);
    const firstDataRow = screen.getAllByRole("row")[1]!;
    fireEvent.click(firstDataRow);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
