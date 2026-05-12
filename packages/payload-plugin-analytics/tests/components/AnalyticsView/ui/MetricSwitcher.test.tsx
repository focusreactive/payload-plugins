import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MetricSwitcher } from "../../../../src/components/AnalyticsView/ui/MetricSwitcher";

describe("MetricSwitcher", () => {
  it("renders options and marks active", () => {
    const onChange = vi.fn();
    render(
      <MetricSwitcher
        value="sessions"
        onChange={onChange}
        options={[
          { value: "sessions", label: "Sessions" },
          { value: "users", label: "Users" },
        ]}
      />,
    );
    fireEvent.click(screen.getByText("Users"));
    expect(onChange).toHaveBeenCalledWith("users");
  });
});
