import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OverviewTabView } from "../../../../src/components/AnalyticsView/tabs/OverviewTabView";
import kpis from "../../../../__fixtures__/admin/kpis.basic.json";
import topPages from "../../../../__fixtures__/admin/topPages.basic.json";
import topSources from "../../../../__fixtures__/admin/topSources.basic.json";
import topEvents from "../../../../__fixtures__/admin/topEvents.basic.json";
import topDevices from "../../../../__fixtures__/admin/topDevices.basic.json";
import topCountries from "../../../../__fixtures__/admin/topCountries.basic.json";
import topCities from "../../../../__fixtures__/admin/topCities.basic.json";

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

type AnyKpi = Parameters<typeof OverviewTabView>[0]["kpis"];
type AnyPages = Parameters<typeof OverviewTabView>[0]["topPages"];
type AnySources = Parameters<typeof OverviewTabView>[0]["topSources"];
type AnyEvents = Parameters<typeof OverviewTabView>[0]["topEvents"];
type AnyDevices = Parameters<typeof OverviewTabView>[0]["topDevices"];
type AnyCountries = Parameters<typeof OverviewTabView>[0]["topCountries"];

describe("OverviewTabView", () => {
  it("renders all five KPI cards and the trend chart card", () => {
    render(
      <OverviewTabView
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
    expect(screen.getAllByText("Bounce rate").length).toBeGreaterThan(0);
    expect(screen.getByText("Avg duration")).toBeInTheDocument();
    expect(screen.getByText("Trend")).toBeInTheDocument();
    expect(screen.getByText("Top pages")).toBeInTheDocument();
    expect(screen.getByText("Top sources")).toBeInTheDocument();
    expect(screen.getByText("Top events")).toBeInTheDocument();
    expect(screen.getByText("Devices")).toBeInTheDocument();
    expect(screen.getByText("Top countries")).toBeInTheDocument();
  });

  it("renders previous-period pills on the KPI cards when comparison is on", () => {
    const { container } = render(<OverviewTabView comparison={{ kind: "previous-period" }} kpis={kpis as AnyKpi} />);
    expect(container.querySelectorAll('[data-tone]').length).toBeGreaterThan(0);
  });

  it("renders the Country/City switcher in the top-countries card", () => {
    render(
      <OverviewTabView
        comparison={{ kind: "none" }}
        topCountries={topCountries as AnyCountries}
        countriesMode="country"
        onCountriesModeChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Country" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "City" })).toBeInTheDocument();
  });

  it("renders 'Top countries' as the card title in country mode", () => {
    render(
      <OverviewTabView
        comparison={{ kind: "none" }}
        topCountries={topCountries as AnyCountries}
        countriesMode="country"
        onCountriesModeChange={() => {}}
      />,
    );
    expect(screen.getByText("Top countries")).toBeInTheDocument();
  });

  it("renders 'Top cities' as the card title in city mode and shows country subtext per row", () => {
    render(
      <OverviewTabView
        comparison={{ kind: "none" }}
        topCountries={topCities as AnyCountries}
        countriesMode="city"
        onCountriesModeChange={() => {}}
      />,
    );
    expect(screen.getByText("Top cities")).toBeInTheDocument();
    expect(screen.getByText("San Francisco")).toBeInTheDocument();
    expect(screen.getByText("United States")).toBeInTheDocument();
  });

  it("calls onCountriesModeChange('city') when the City button is clicked", async () => {
    const onChange = vi.fn();
    const user = (await import("@testing-library/user-event")).default.setup();
    render(
      <OverviewTabView
        comparison={{ kind: "none" }}
        topCountries={topCountries as AnyCountries}
        countriesMode="country"
        onCountriesModeChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "City" }));
    expect(onChange).toHaveBeenCalledWith("city");
  });
});
