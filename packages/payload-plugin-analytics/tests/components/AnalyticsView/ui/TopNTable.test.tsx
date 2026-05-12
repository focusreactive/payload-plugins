import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TopNTable } from "../../../../src/components/AnalyticsView/ui/TopNTable";

const rows = Array.from({ length: 7 }, (_, i) => ({ name: `Row ${i}`, count: 100 - i }));

describe("TopNTable", () => {
  it("renders initialVisible rows by default", () => {
    render(
      <TopNTable
        rows={rows}
        initialVisible={5}
        columns={[
          { key: "name", header: "Name" },
          { key: "count", header: "Count", align: "right" },
        ]}
      />,
    );
    expect(screen.getByText("Row 0")).toBeInTheDocument();
    expect(screen.getByText("Row 4")).toBeInTheDocument();
    expect(screen.queryByText("Row 5")).not.toBeInTheDocument();
  });

  it("toggles to show all on footer click and back", () => {
    render(
      <TopNTable
        rows={rows}
        initialVisible={5}
        columns={[
          { key: "name", header: "Name" },
          { key: "count", header: "Count", align: "right" },
        ]}
      />,
    );
    fireEvent.click(screen.getByText(/Show all/));
    expect(screen.getByText("Row 6")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Show less/));
    expect(screen.queryByText("Row 6")).not.toBeInTheDocument();
  });

  it("renders empty message when rows length is 0", () => {
    render(
      <TopNTable
        rows={[]}
        columns={[{ key: "name", header: "Name" }]}
        emptyMessage="Nothing yet."
      />,
    );
    expect(screen.getByText("Nothing yet.")).toBeInTheDocument();
  });

  it("renders skeleton when loading", () => {
    const { container } = render(
      <TopNTable rows={[]} columns={[{ key: "name", header: "Name" }]} loading />,
    );
    expect(container.querySelector(".pa-animate-shimmer")).toBeInTheDocument();
  });
});
