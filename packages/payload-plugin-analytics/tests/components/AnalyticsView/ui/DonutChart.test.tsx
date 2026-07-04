import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockNextDynamic } from "../../../__helpers__/mockNextDynamic";
import { DonutChart } from "../../../../src/components/AnalyticsView/ui/DonutChart";
import { DonutChartInner } from "../../../../src/components/AnalyticsView/ui/DonutChartInner";

vi.mock("next/dynamic", () => ({ default: mockNextDynamic }));

const slices = [
  { label: "Desktop", value: 9846 },
  { label: "Mobile", value: 7421 },
  { label: "Tablet", value: 723 },
  { label: "Other", value: 244 },
];

describe("DonutChart", () => {
  it("renders inner wrapper and legend rows after dynamic import resolves", async () => {
    render(<DonutChart data={slices} />);
    await waitFor(() => expect(screen.getByTestId("donut-chart-inner")).toBeInTheDocument(), {
      timeout: 5000,
    });
    expect(screen.getByText("Desktop")).toBeInTheDocument();
    expect(screen.getByText("Mobile")).toBeInTheDocument();
  });

  it("renders skeleton when loading", () => {
    const { container } = render(<DonutChart data={[]} loading />);
    expect(container.querySelector(".franalytics-animate-shimmer")).toBeInTheDocument();
  });

  it("renders Metric on each legend row when any slice has prev", () => {
    const { container } = render(
      <DonutChartInner
        centerCaption="SESSIONS"
        data={[
          { label: "Desktop", value: 2153, prev: 1742 },
          { label: "Mobile", value: 978, prev: 1210 },
        ]}
      />
    );
    expect(container.querySelectorAll('[data-metric-mode="inline"]').length).toBe(2);
    expect(container.querySelector('[data-tone="positive"]')).not.toBeNull();
    expect(container.querySelector('[data-tone="negative"]')).not.toBeNull();
  });
});
