import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Activity } from "lucide-react";
import { Metric } from "../../../../../src/components/AnalyticsView/ui/Metric";
import { formatNumber, formatPercentage, formatDuration } from "../../../../../src/components/AnalyticsView/numberFormatters";

describe("Metric", () => {
  it("renders the formatted current value", () => {
    render(<Metric value={18234} format={formatNumber} />);
    expect(screen.getByText("18,234")).toBeInTheDocument();
  });

  it("renders no comparison pill when prevValue is null", () => {
    const { container } = render(<Metric value={100} prevValue={null} format={formatNumber} />);
    expect(container.querySelector("[data-tone]")).toBeNull();
  });

  it("renders a positive pill with up arrow when current > previous", () => {
    const { container } = render(<Metric value={120} prevValue={80} format={formatNumber} />);
    const pill = container.querySelector('[data-tone="positive"]');
    expect(pill).not.toBeNull();
    expect(pill?.textContent).toContain("80");
    // lucide-react renders icons as SVG; assert the up-arrow svg is present in the pill
    expect(pill?.querySelector("svg.lucide-arrow-up")).not.toBeNull();
  });

  it("renders a negative pill with down arrow when current < previous", () => {
    const { container } = render(<Metric value={50} prevValue={80} format={formatNumber} />);
    const pill = container.querySelector('[data-tone="negative"]');
    expect(pill).not.toBeNull();
    expect(pill?.querySelector("svg.lucide-arrow-down")).not.toBeNull();
  });

  it("renders a flat pill with neutral arrow when values are equal", () => {
    const { container } = render(<Metric value={80} prevValue={80} format={formatNumber} />);
    expect(container.querySelector('[data-tone="flat"]')).not.toBeNull();
  });

  it("invertDelta flips positive/negative tones", () => {
    const { container } = render(<Metric value={0.4} prevValue={0.5} format={formatPercentage} invertDelta />);
    // value dropped (0.4 < 0.5) but invertDelta makes the drop positive
    expect(container.querySelector('[data-tone="positive"]')).not.toBeNull();
  });

  it("does NOT render the text 'vs' anywhere", () => {
    render(<Metric value={120} prevValue={80} format={formatNumber} />);
    expect(screen.queryByText(/^vs /u)).toBeNull();
  });

  it("formats with formatPercentage when provided", () => {
    render(<Metric value={0.412} format={formatPercentage} />);
    expect(screen.getByText("41.2%")).toBeInTheDocument();
  });

  it("formats with formatDuration when provided", () => {
    render(<Metric value={168} format={formatDuration} />);
    expect(screen.getByText("2m 48s")).toBeInTheDocument();
  });

  it("renders the supplied icon", () => {
    const { container } = render(<Metric value={5} format={formatNumber} icon={Activity} mode="chip" />);
    // lucide icons render as <svg>
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("chip mode renders both halves when prevValue is set", () => {
    const { container } = render(<Metric value={64} prevValue={41} format={formatNumber} icon={Activity} mode="chip" />);
    const root = container.querySelector('[data-metric-mode="chip"]');
    expect(root).not.toBeNull();
    expect(root?.textContent).toContain("64");
    expect(root?.textContent).toContain("41");
  });

  it("chip mode without prevValue renders only the current half", () => {
    const { container } = render(<Metric value={64} prevValue={null} format={formatNumber} icon={Activity} mode="chip" />);
    expect(container.querySelector("[data-tone]")).toBeNull();
    expect(container.textContent).toContain("64");
  });
});
