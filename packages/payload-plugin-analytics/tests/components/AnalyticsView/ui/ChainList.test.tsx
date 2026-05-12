import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChainList } from "../../../../src/components/AnalyticsView/ui/ChainList";

describe("ChainList", () => {
  it("renders page pills and a lead-action pill with conversion rate", () => {
    render(
      <ChainList
        rows={[
          {
            path: [
              { kind: "page", value: "/" },
              { kind: "page", value: "/pricing" },
              { kind: "leadAction", value: "phone_click" },
            ],
            count: 142,
            conversionRate: 12.4,
          },
        ]}
      />,
    );
    expect(screen.getByText("/")).toBeInTheDocument();
    expect(screen.getByText("/pricing")).toBeInTheDocument();
    expect(screen.getByText(/Phone click/)).toBeInTheDocument();
    expect(screen.getByText("142")).toBeInTheDocument();
    expect(screen.getByText("12.4%")).toBeInTheDocument();
  });
});
