import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LeadActionsPerPageTable } from "../../../../src/components/AnalyticsView/tabs/LeadActionsPerPageTable";
import type { LeadActionKind } from "../../../../src/types/events";

const rows: Array<{ pagePath: string; counts: Partial<Record<LeadActionKind, number>> }> = [
  { pagePath: "/contact", counts: { phone_click: 348, email_click: 142, form_submit: 122 } },
  { pagePath: "/pricing", counts: { phone_click: 211, form_submit: 98 } },
];

describe("LeadActionsPerPageTable", () => {
  it("computes per-row totals and shows top-3 chips", () => {
    render(<LeadActionsPerPageTable rows={rows} />);
    expect(screen.getByText("/contact")).toBeInTheDocument();
    expect(screen.getByText("612")).toBeInTheDocument();
  });

  it("expands a row to reveal full breakdown via BarList", () => {
    render(<LeadActionsPerPageTable rows={rows} />);
    fireEvent.click(screen.getByText("/contact"));
    expect(screen.getAllByText(/Phone click/).length).toBeGreaterThan(0);
  });
});
