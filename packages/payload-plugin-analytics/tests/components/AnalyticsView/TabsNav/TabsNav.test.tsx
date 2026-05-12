import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TabsNav } from "../../../../src/components/AnalyticsView/TabsNav";

describe("TabsNav", () => {
  it("renders all three tabs and highlights the active one", () => {
    render(<TabsNav active="lead-actions" onChange={() => {}} counts={{ leads: 1842, sessions: 18234 }} />);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Lead Actions")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    const active = screen.getByRole("tab", { selected: true });
    expect(active.textContent).toContain("Lead Actions");
  });

  it("invokes onChange when clicking a tab", () => {
    const onChange = vi.fn();
    render(<TabsNav active="overview" onChange={onChange} />);
    fireEvent.click(screen.getByText("Sessions"));
    expect(onChange).toHaveBeenCalledWith("sessions");
  });
});
