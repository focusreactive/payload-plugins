import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarList } from "../../../../src/components/AnalyticsView/ui/BarList";

describe("BarList", () => {
  it("renders rows and computes percentages", () => {
    render(
      <BarList
        rows={[
          { label: "A", value: 80 },
          { label: "B", value: 20 },
        ]}
      />
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("80.0%")).toBeInTheDocument();
  });

  it("expands beyond initialVisible", () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({ label: `Row ${i}`, value: 10 - i }));
    render(<BarList rows={rows} initialVisible={5} />);
    expect(screen.queryByText("Row 7")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/3 more/u));
    expect(screen.getByText("Row 7")).toBeInTheDocument();
  });

  it("renders a previous-period bar when any row carries a prev value", () => {
    const { container } = render(
      <BarList
        rows={[
          { label: "A", value: 80, prev: 40 },
          { label: "B", value: 20, prev: 30 },
        ]}
      />
    );
    expect(container.querySelectorAll('[data-bar-role="prev"]').length).toBe(2);
  });

  it("does NOT render previous-period bars when no row has prev", () => {
    const { container } = render(
      <BarList
        rows={[
          { label: "A", value: 80 },
          { label: "B", value: 20 },
        ]}
      />
    );
    expect(container.querySelector('[data-bar-role="prev"]')).toBeNull();
  });

  it("scales current and previous bars against the shared max", () => {
    const { container } = render(<BarList rows={[{ label: "A", value: 100, prev: 200 }]} />);
    const cur = container.querySelector('[data-bar-role="current"]') as HTMLElement;
    const prev = container.querySelector('[data-bar-role="prev"]') as HTMLElement;
    // shared max is 200 → current=50%, prev=100%
    expect(cur?.style.width).toBe("50%");
    expect(prev?.style.width).toBe("100%");
  });

  it("renders the right-cell value through Metric with the prev pill", () => {
    const { container } = render(<BarList rows={[{ label: "A", value: 80, prev: 40 }]} />);
    expect(container.querySelector('[data-metric-mode="inline"]')).not.toBeNull();
    expect(container.querySelector('[data-tone="positive"]')).not.toBeNull();
  });
});
