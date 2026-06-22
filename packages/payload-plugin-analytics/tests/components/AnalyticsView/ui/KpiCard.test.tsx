import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { KpiCard } from "../../../../src/components/AnalyticsView/ui/KpiCard";
import {
  formatNumber,
  formatPercentage,
  formatDuration,
} from "../../../../src/components/AnalyticsView/numberFormatters";

describe("KpiCard", () => {
  it("renders the current value through the provided format function", () => {
    render(<KpiCard label="Sessions" value={18234} format={formatNumber} />);
    expect(screen.getByText("18,234")).toBeInTheDocument();
  });

  it("renders the previous-period pill when prevValue is provided", () => {
    const { container } = render(
      <KpiCard label="Sessions" value={18234} prevValue={16219} format={formatNumber} />
    );
    expect(container.querySelector('[data-tone="positive"]')).not.toBeNull();
    expect(container.querySelector('[data-tone="positive"]')?.textContent).toContain("16,219");
  });

  it("renders no pill when prevValue is null", () => {
    const { container } = render(
      <KpiCard label="Sessions" value={18234} prevValue={null} format={formatNumber} />
    );
    expect(container.querySelector("[data-tone]")).toBeNull();
  });

  it("invertDelta swaps the tone (lower bounce rate is positive)", () => {
    const { container } = render(
      <KpiCard label="Bounce" value={0.4} prevValue={0.5} format={formatPercentage} invertDelta />
    );
    expect(container.querySelector('[data-tone="positive"]')).not.toBeNull();
  });

  it("never renders the text 'vs '", () => {
    render(<KpiCard label="Sessions" value={18234} prevValue={16219} format={formatNumber} />);
    expect(screen.queryByText(/^vs /u)).toBeNull();
  });

  it("formats duration values", () => {
    render(<KpiCard label="Avg" value={168} format={formatDuration} />);
    expect(screen.getByText("2m 48s")).toBeInTheDocument();
  });

  it("renders SetupWarningIcon when missing keys passed", () => {
    render(<KpiCard label="Avg" value={0} format={formatDuration} missing={["fr_elapsed_ms"]} />);
    expect(screen.getByRole("img", { name: /setup required/iu })).toBeInTheDocument();
  });

  it("renders skeleton when loading", () => {
    const { container } = render(<KpiCard label="X" value={0} format={formatNumber} loading />);
    expect(container.querySelector(".pa-animate-shimmer")).toBeInTheDocument();
  });

  it("renders error tile when error passed", () => {
    render(<KpiCard label="X" value={0} format={formatNumber} error={new Error("oops")} />);
    expect(screen.getByText(/couldn't load/iu)).toBeInTheDocument();
  });
});
