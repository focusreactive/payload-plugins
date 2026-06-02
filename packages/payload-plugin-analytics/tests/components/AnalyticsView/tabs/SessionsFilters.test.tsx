import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SessionsFilters } from "../../../../src/components/AnalyticsView/tabs/SessionsFilters";

describe("SessionsFilters", () => {
  it("toggles the had-lead pill", () => {
    const onChange = vi.fn();
    render(<SessionsFilters filters={{}} onChange={onChange} sourceOptions={["google", "(direct)"]} countryOptions={["US", "DE"]} />);
    fireEvent.click(screen.getByText(/Had lead action/u));
    expect(onChange).toHaveBeenCalledWith({ hadLeadAction: true });
  });

  it("selects a source from the dropdown", () => {
    const onChange = vi.fn();
    render(<SessionsFilters filters={{}} onChange={onChange} sourceOptions={["google", "(direct)"]} countryOptions={[]} />);
    fireEvent.click(screen.getByText(/^Source$/u));
    fireEvent.click(screen.getByText("google"));
    expect(onChange).toHaveBeenCalledWith({ source: "google" });
  });
});
