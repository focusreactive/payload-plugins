import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SetupRequiredCard } from "../../../../src/components/AnalyticsView/ui/SetupRequiredCard";

describe("SetupRequiredCard", () => {
  it("renders one line per missing key with code formatting", () => {
    render(<SetupRequiredCard missingKeys={["fr_session_id", "fr_event_seq"]} />);
    expect(screen.getByText(/fr_session_id/)).toBeInTheDocument();
    expect(screen.getByText(/fr_event_seq/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /setup guide/i })).toBeInTheDocument();
  });
});
