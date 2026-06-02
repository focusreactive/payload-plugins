import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SetupWarningIcon } from "../../../../src/components/AnalyticsView/ui/SetupWarningIcon";

describe("SetupWarningIcon", () => {
  it("renders tooltip body with the missing key copy", () => {
    render(<SetupWarningIcon missingKey="fr_elapsed_ms" />);
    expect(screen.getByRole("img", { name: /setup required/iu })).toBeInTheDocument();
    expect(screen.getByText(/fr_elapsed_ms/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /setup guide/iu })).toBeInTheDocument();
  });
});
