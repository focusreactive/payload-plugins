import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LeadActionsPerPageTable } from "../../../../src/components/AnalyticsView/tabs/LeadActionsPerPageTable";
import { LeadActionRegistryProvider } from "../../../../src/components/AnalyticsView/contexts/LeadActionRegistryContext";

const rows: Array<{ pagePath: string; counts: Record<string, number> }> = [
  { pagePath: "/contact", counts: { phone_click: 348, email_click: 142, form_submit: 122 } },
  { pagePath: "/pricing", counts: { phone_click: 211, form_submit: 98 } },
];

function withProvider(node: React.ReactElement) {
  return <LeadActionRegistryProvider registry={{}}>{node}</LeadActionRegistryProvider>;
}

describe("LeadActionsPerPageTable", () => {
  it("computes per-row totals and shows top-3 chips", () => {
    render(withProvider(<LeadActionsPerPageTable rows={rows} />));
    expect(screen.getByText("/contact")).toBeInTheDocument();
    expect(screen.getByText("612")).toBeInTheDocument();
  });

  it("expands a row to reveal full breakdown via BarList", () => {
    render(withProvider(<LeadActionsPerPageTable rows={rows} />));
    fireEvent.click(screen.getByText("/contact"));
    expect(screen.getAllByText(/Phone click/u).length).toBeGreaterThan(0);
  });

  it("renders the previous-period pill on the Leads column and chips", () => {
    const prevByPagePath = new Map([
      ["/pricing", { contactClick: 41, downloadClick: 18 } as Record<string, number>],
    ]);
    const { container } = render(
      withProvider(
        <LeadActionsPerPageTable
          rows={[
            {
              pagePath: "/pricing",
              counts: { contactClick: 64, downloadClick: 26 } as Record<string, number>,
            },
          ]}
          prevByPagePath={prevByPagePath as never}
        />
      )
    );
    expect(container.querySelectorAll("[data-tone]").length).toBeGreaterThan(0);
    expect(container.querySelector('[data-metric-mode="chip"]')).not.toBeNull();
  });
});
