import { render, screen } from "@testing-library/react";
import { TrendingUp } from "lucide-react";
import { describe, it, expect } from "vitest";
import { DataCard } from "../../../../src/components/AnalyticsView/ui/DataCard";

describe("DataCard", () => {
  it("renders title, icon, action, and children", () => {
    render(
      <DataCard title="Trend" icon={TrendingUp} action={<span>act</span>}>
        <p>body</p>
      </DataCard>,
    );
    expect(screen.getByText("Trend")).toBeInTheDocument();
    expect(screen.getByText("act")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});
