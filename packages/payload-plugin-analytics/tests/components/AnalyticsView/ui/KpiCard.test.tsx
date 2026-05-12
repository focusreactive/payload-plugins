import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { KpiCard } from "../../../../src/components/AnalyticsView/ui/KpiCard";

describe("KpiCard", () => {
  it("formats number values and shows delta with up arrow when positive", () => {
    render(<KpiCard label="Sessions" value={18234} formatter="number" delta={12.4} />);
    expect(screen.getByText("18,234")).toBeInTheDocument();
    expect(screen.getByText(/12\.4%/)).toBeInTheDocument();
  });

  it("formats percent and shows pp unit", () => {
    render(<KpiCard label="Bounce" value={0.412} formatter="percent" delta={-3.1} deltaUnit="pp" invertDelta />);
    expect(screen.getByText("41.2%")).toBeInTheDocument();
    expect(screen.getByText(/3\.1 pp/)).toBeInTheDocument();
  });

  it("formats duration", () => {
    render(<KpiCard label="Avg" value={168} formatter="duration" />);
    expect(screen.getByText("2m 48s")).toBeInTheDocument();
  });

  it("invertDelta swaps the tone for the same delta sign", () => {
    const { container } = render(
      <KpiCard label="Bounce" value={0.4} formatter="percent" delta={3.1} invertDelta />,
    );
    expect(container.querySelector('[data-tone="negative"]')).toBeInTheDocument();
  });

  it("renders SetupWarningIcon when missing keys passed", () => {
    render(
      <KpiCard label="Avg" value={0} formatter="duration" missing={["fr_elapsed_ms"]} />,
    );
    expect(screen.getByRole("img", { name: /setup required/i })).toBeInTheDocument();
  });

  it("renders skeleton when loading", () => {
    const { container } = render(<KpiCard label="X" value={0} formatter="number" loading />);
    expect(container.querySelector(".pa-animate-shimmer")).toBeInTheDocument();
  });

  it("renders error tile when error passed", () => {
    render(<KpiCard label="X" value={0} formatter="number" error={new Error("oops")} />);
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
  });
});
