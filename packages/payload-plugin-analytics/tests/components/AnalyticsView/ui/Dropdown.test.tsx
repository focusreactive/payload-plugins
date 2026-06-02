import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dropdown } from "../../../../src/components/AnalyticsView/ui/Dropdown";

describe("Dropdown", () => {
  it("opens and closes via the trigger", () => {
    render(<Dropdown trigger={<span>Open</span>}>menu</Dropdown>);
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByText("menu")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Open"));
    expect(screen.queryByText("menu")).not.toBeInTheDocument();
  });

  it("closes on Escape", () => {
    render(<Dropdown trigger={<span>Open</span>}>menu</Dropdown>);
    fireEvent.click(screen.getByText("Open"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("menu")).not.toBeInTheDocument();
  });
});
