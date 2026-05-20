import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockNextDynamic } from "../../../__helpers__/mockNextDynamic";

vi.mock("next/dynamic", () => ({ default: mockNextDynamic }));

import { TrendChart } from "../../../../src/components/AnalyticsView/ui/TrendChart";

const series = [
  { date: "2026-05-01", sessions: 100, users: 80, pageViews: 300, bounceRate: 0.4, avgSessionDuration: 120 },
  { date: "2026-05-02", sessions: 120, users: 90, pageViews: 350, bounceRate: 0.35, avgSessionDuration: 140 },
];
const prev = [
  { date: "2026-04-01", sessions: 80, users: 70, pageViews: 250, bounceRate: 0.45, avgSessionDuration: 110 },
  { date: "2026-04-02", sessions: 90, users: 75, pageViews: 280, bounceRate: 0.42, avgSessionDuration: 115 },
];

describe("TrendChart", () => {
  it("renders the chart inner wrapper after dynamic import resolves", async () => {
    render(<TrendChart series={series} comparisonSeries={prev} metric="sessions" />);
    await waitFor(() => expect(screen.getByTestId("trend-chart-inner")).toBeInTheDocument(), {
      timeout: 5000,
    });
  });

  it("shows skeleton when loading=true", () => {
    const { container } = render(<TrendChart series={[]} metric="sessions" loading />);
    expect(container.querySelector(".pa-animate-shimmer")).toBeInTheDocument();
  });
});
