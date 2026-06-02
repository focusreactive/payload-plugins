import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorTile } from "../../../../src/components/AnalyticsView/ui/ErrorTile";

describe("ErrorTile", () => {
  it("maps quota errors to a friendly message", () => {
    render(<ErrorTile error={new Error("HTTP 429 quota exhausted")} />);
    expect(screen.getByText(/quota exceeded/iu)).toBeInTheDocument();
  });
  it("invokes onRetry when clicked", () => {
    const fn = vi.fn();
    render(<ErrorTile error={new Error("network")} onRetry={fn} />);
    fireEvent.click(screen.getByRole("button", { name: /retry/iu }));
    expect(fn).toHaveBeenCalled();
  });
});
