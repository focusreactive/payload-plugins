import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SetupRequiredCard } from "../../../../src/components/AnalyticsView/ui/SetupRequiredCard";

describe("SetupRequiredCard", () => {
  it("renders one line per missing key with code formatting", () => {
    render(<SetupRequiredCard missingKeys={["fr_session_id", "fr_event_seq"]} />);
    expect(screen.getByText(/fr_session_id/u)).toBeInTheDocument();
    expect(screen.getByText(/fr_event_seq/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /setup guide/iu })).toBeInTheDocument();
  });

  it("renders the fr_lead_type copy with lead-action context", () => {
    render(<SetupRequiredCard missingKeys={["fr_lead_type"]} />);
    expect(screen.getByText(/fr_lead_type/u)).toBeInTheDocument();
    expect(screen.getByText(/lead-action breakdowns/iu)).toBeInTheDocument();
  });
});
