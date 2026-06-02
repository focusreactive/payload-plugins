import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RowRenderer } from "../../../../src/components/AnalyticsView/render/RowRenderer";
import type { ResolvedRow } from "../../../../src/types/layout";

vi.mock("../../../../src/components/AnalyticsView/blocks/builtInRegistry", () => ({
  BUILTIN_BLOCK_COMPONENTS: new Proxy(
    {},
    {
      get: (_t, id: string) =>
        function StubBlock() {
          return <div data-stub-block={id} />;
        },
    }
  ),
}));

const baseProps = {
  dateRange: { preset: "last-14d" as const },
  comparison: { kind: "none" as const },
  t: (s: string) => s,
};

function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("RowRenderer", () => {
  it("renders a CSS grid with N columns", () => {
    const row = {
      id: "test-row",
      order: 1,
      columns: 3,
      blocks: [{ id: "sessions-kpi", order: 1, colSpan: 1 }],
    } as unknown as ResolvedRow;

    const { container } = renderWith(<RowRenderer row={row} registry={{ "sessions-kpi": { component: "x" } }} {...baseProps} />);
    const grid = container.firstChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
  });

  it("applies colSpan via grid-column on each child wrapper", () => {
    const row = {
      id: "test-row",
      order: 1,
      columns: 3,
      blocks: [
        { id: "devices-donut", order: 1, colSpan: 1 },
        { id: "top-countries", order: 2, colSpan: 2 },
      ],
    } as unknown as ResolvedRow;

    const { container } = renderWith(<RowRenderer row={row} registry={{ "devices-donut": { component: "x" }, "top-countries": { component: "x" } }} {...baseProps} />);
    const cells = container.querySelectorAll<HTMLElement>("[data-block-cell]");
    expect(cells).toHaveLength(2);
    expect(cells[0].style.gridColumn).toBe("span 1");
    expect(cells[1].style.gridColumn).toBe("span 2");
  });
});
