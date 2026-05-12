import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OverviewTab } from "../../../../src/components/AnalyticsView/tabs/OverviewTab";
import kpis from "../../../../__fixtures__/admin/kpis.basic.json";
import topPages from "../../../../__fixtures__/admin/topPages.basic.json";
import topSources from "../../../../__fixtures__/admin/topSources.basic.json";
import topEvents from "../../../../__fixtures__/admin/topEvents.basic.json";
import topDevices from "../../../../__fixtures__/admin/topDevices.basic.json";
import topCountries from "../../../../__fixtures__/admin/topCountries.basic.json";

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

type AnyKpi = Parameters<typeof OverviewTab>[0]["kpis"];
type AnyPages = Parameters<typeof OverviewTab>[0]["topPages"];
type AnySources = Parameters<typeof OverviewTab>[0]["topSources"];
type AnyEvents = Parameters<typeof OverviewTab>[0]["topEvents"];
type AnyDevices = Parameters<typeof OverviewTab>[0]["topDevices"];
type AnyCountries = Parameters<typeof OverviewTab>[0]["topCountries"];

describe("OverviewTab", () => {
  it("renders all five KPI cards and the trend chart card", () => {
    render(
      <OverviewTab
        comparison={{ kind: "previous-period" }}
        kpis={kpis as AnyKpi}
        topPages={topPages as AnyPages}
        topSources={topSources as AnySources}
        topEvents={topEvents as AnyEvents}
        topDevices={topDevices as AnyDevices}
        topCountries={topCountries as AnyCountries}
      />,
    );
    expect(screen.getAllByText("Sessions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Users").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pageviews").length).toBeGreaterThan(0);
    expect(screen.getByText("Bounce rate")).toBeInTheDocument();
    expect(screen.getByText("Avg duration")).toBeInTheDocument();
    expect(screen.getByText("Trend")).toBeInTheDocument();
    expect(screen.getByText("Top pages")).toBeInTheDocument();
    expect(screen.getByText("Top sources")).toBeInTheDocument();
    expect(screen.getByText("Top events")).toBeInTheDocument();
    expect(screen.getByText("Devices")).toBeInTheDocument();
    expect(screen.getByText("Top countries")).toBeInTheDocument();
  });

  it("shows percent deltas for KPIs when comparison is on", () => {
    render(<OverviewTab comparison={{ kind: "previous-period" }} kpis={kpis as AnyKpi} />);
    expect(screen.getAllByText(/\d+\.\d+%/).length).toBeGreaterThan(0);
  });
});
