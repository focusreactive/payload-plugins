import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarList } from "../../../../src/components/AnalyticsView/ui/BarList";

describe("BarList", () => {
  it("renders rows and computes percentages", () => {
    render(
      <BarList
        rows={[
          { label: "A", value: 80 },
          { label: "B", value: 20 },
        ]}
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("80.0%")).toBeInTheDocument();
  });

  it("expands beyond initialVisible", () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({ label: `Row ${i}`, value: 10 - i }));
    render(<BarList rows={rows} initialVisible={5} />);
    expect(screen.queryByText("Row 7")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/3 more/));
    expect(screen.getByText("Row 7")).toBeInTheDocument();
  });
});
