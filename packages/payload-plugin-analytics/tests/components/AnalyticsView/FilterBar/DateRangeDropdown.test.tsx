import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DateRangeDropdown } from "../../../../src/components/AnalyticsView/FilterBar/DateRangeDropdown";

describe("DateRangeDropdown", () => {
  it("renders the resolved preset label", () => {
    render(<DateRangeDropdown value={{ preset: "last-7d" }} onChange={() => {}} />);
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
  });

  it("renders a custom-range label when value is from/to", () => {
    render(<DateRangeDropdown value={{ from: "2026-04-01", to: "2026-04-30" }} onChange={() => {}} />);
    expect(screen.getByText(/Apr 1.*Apr 30/u)).toBeInTheDocument();
  });

  it("clicking a preset calls onChange with that preset", () => {
    const onChange = vi.fn();
    render(<DateRangeDropdown value={{ preset: "last-7d" }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Last 30 days"));
    expect(onChange).toHaveBeenCalledWith({ preset: "last-30d" });
  });
});
