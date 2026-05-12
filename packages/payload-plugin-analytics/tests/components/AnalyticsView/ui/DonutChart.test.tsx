import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockNextDynamic } from "../../../__helpers__/mockNextDynamic";

vi.mock("next/dynamic", () => ({ default: mockNextDynamic }));

import { DonutChart } from "../../../../src/components/AnalyticsView/ui/DonutChart";

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
    expect(container.querySelector(".pa-animate-shimmer")).toBeInTheDocument();
  });
});
