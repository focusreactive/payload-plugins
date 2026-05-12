import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ComparisonDropdown } from "../../../../src/components/AnalyticsView/FilterBar/ComparisonDropdown";

describe("ComparisonDropdown", () => {
  it("renders label for current value", () => {
    render(<ComparisonDropdown value={{ kind: "previous-period" }} onChange={() => {}} />);
    expect(screen.getByText("Previous period")).toBeInTheDocument();
  });
  it("calls onChange with selection", () => {
    const onChange = vi.fn();
    render(<ComparisonDropdown value={{ kind: "none" }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Previous period"));
    expect(onChange).toHaveBeenCalledWith({ kind: "previous-period" });
  });
});
