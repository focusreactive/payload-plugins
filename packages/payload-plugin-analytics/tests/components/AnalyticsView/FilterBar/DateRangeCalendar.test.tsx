import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DateRangeCalendar } from "../../../../src/components/AnalyticsView/FilterBar/DateRangeCalendar";

describe("DateRangeCalendar", () => {
  it("Cancel closes without applying", () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(<DateRangeCalendar value={{ preset: "last-7d" }} onApply={onApply} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("Apply with active preset writes a preset range", () => {
    const onApply = vi.fn();
    render(<DateRangeCalendar value={{ preset: "last-7d" }} onApply={onApply} onClose={() => {}} />);
    fireEvent.click(screen.getByText("Apply"));
    expect(onApply).toHaveBeenCalledWith({ preset: "last-7d" });
  });
});
