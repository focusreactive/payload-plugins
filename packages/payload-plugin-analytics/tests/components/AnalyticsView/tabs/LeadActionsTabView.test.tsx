import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LeadActionsTabView } from "../../../../src/components/AnalyticsView/tabs/LeadActionsTabView";
import leads from "../../../../__fixtures__/admin/leadActions.basic.json";
import journeys from "../../../../__fixtures__/admin/journeys.basic.json";

type AnyLeads = Parameters<typeof LeadActionsTabView>[0]["leadActions"];
type AnyJourneys = Parameters<typeof LeadActionsTabView>[0]["journeys"];

describe("LeadActionsTabView", () => {
  it("renders 3 KPI cards, by-type bars, per-page table, and discovery paths", () => {
    render(
      <LeadActionsTabView
        comparison={{ kind: "previous-period" }}
        leadActions={leads as AnyLeads}
        journeys={journeys as AnyJourneys}
        totalSessions={18234}
      />,
    );
    expect(screen.getByText("Total leads")).toBeInTheDocument();
    expect(screen.getByText("Conversion rate")).toBeInTheDocument();
    expect(screen.getByText("Avg time to action")).toBeInTheDocument();
    expect(screen.getByText("Lead actions by type")).toBeInTheDocument();
    expect(screen.getByText("Per-page breakdown")).toBeInTheDocument();
    expect(screen.getByText("Discovery paths")).toBeInTheDocument();
  });

  it("shows SetupWarningIcon when fr_elapsed_ms is missing", () => {
    const missing = { ...(leads as AnyLeads), missing: ["fr_elapsed_ms"] } as AnyLeads;
    render(
      <LeadActionsTabView
        comparison={{ kind: "none" }}
        leadActions={missing}
        totalSessions={18234}
      />,
    );
    expect(screen.getByRole("img", { name: /setup required/i })).toBeInTheDocument();
  });
});
