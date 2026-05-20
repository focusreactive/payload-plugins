import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SessionsTabView } from "../../../../src/components/AnalyticsView/tabs/SessionsTabView";
import sessions from "../../../../__fixtures__/admin/sessions.basic.json";
import type { SessionsResponse } from "../../../../src/types/query";

const fixture = sessions as SessionsResponse;

describe("SessionsTabView", () => {
  it("renders caveat banner, filters, and table rows", () => {
    render(
      <SessionsTabView
        filters={{}}
        onFiltersChange={() => {}}
        rows={fixture.rows}
        sourceOptions={[]}
        countryOptions={[]}
        hasNextPage={fixture.pagination?.hasMore ?? false}
        openId={null}
        onOpenRow={() => {}}
        onCloseDrawer={() => {}}
      />,
    );
    expect(screen.getByText(/Sessions without a recorded start time/i)).toBeInTheDocument();
    expect(screen.getByText("Landing page")).toBeInTheDocument();
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
  });

  it("replaces table with SetupRequiredCard when setupRequired", () => {
    render(
      <SessionsTabView
        filters={{}}
        onFiltersChange={() => {}}
        rows={[]}
        sourceOptions={[]}
        countryOptions={[]}
        setupRequired
        missing={["fr_session_id"]}
        hasNextPage={false}
        openId={null}
        onOpenRow={() => {}}
        onCloseDrawer={() => {}}
      />,
    );
    expect(screen.getByText(/Setup required/i)).toBeInTheDocument();
  });

  it("calls onOpenRow when a row is clicked", () => {
    const onOpenRow = vi.fn();
    render(
      <SessionsTabView
        filters={{}}
        onFiltersChange={() => {}}
        rows={fixture.rows}
        sourceOptions={[]}
        countryOptions={[]}
        hasNextPage={fixture.pagination?.hasMore ?? false}
        openId={null}
        onOpenRow={onOpenRow}
        onCloseDrawer={() => {}}
      />,
    );
    const firstDataRow = screen.getAllByRole("row")[1]!;
    fireEvent.click(firstDataRow);
    expect(onOpenRow).toHaveBeenCalledWith(expect.any(String));
  });

  it("renders the drawer when openId is set", () => {
    render(
      <SessionsTabView
        filters={{}}
        onFiltersChange={() => {}}
        rows={fixture.rows}
        sourceOptions={[]}
        countryOptions={[]}
        hasNextPage={fixture.pagination?.hasMore ?? false}
        openId={fixture.rows[0]!.sessionId}
        onOpenRow={() => {}}
        onCloseDrawer={() => {}}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
