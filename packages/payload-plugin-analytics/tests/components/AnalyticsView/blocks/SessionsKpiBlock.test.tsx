import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionsKpiBlock } from "../../../../src/components/AnalyticsView/blocks/SessionsKpiBlock";

vi.mock("../../../../src/components/AnalyticsView/hooks/queries/useKpisQuery", () => ({
  useKpisQuery: vi.fn(),
}));
import { useKpisQuery } from "../../../../src/components/AnalyticsView/hooks/queries/useKpisQuery";

function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const baseProps = {
  dateRange: { preset: "last-14d" as const },
  comparison: { kind: "none" as const },
  colSpan: 1,
  t: (s: string) => s,
};

beforeEach(() => {
  vi.mocked(useKpisQuery).mockReset();
});

describe("SessionsKpiBlock", () => {
  it("renders sessions count from useKpisQuery", () => {
    vi.mocked(useKpisQuery).mockReturnValue({
      data: { current: { sessions: 1234, users: 0, pageViews: 0, bounceRate: 0, avgSessionDuration: 0 }, series: [] },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useKpisQuery>);

    renderWith(<SessionsKpiBlock {...baseProps} />);
    expect(screen.getByText(/Sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/1,234|1234/)).toBeInTheDocument();
  });

  it("renders previous-period delta when comparison is set", () => {
    vi.mocked(useKpisQuery).mockReturnValue({
      data: {
        current: { sessions: 100, users: 0, pageViews: 0, bounceRate: 0, avgSessionDuration: 0 },
        comparison: { sessions: 50, users: 0, pageViews: 0, bounceRate: 0, avgSessionDuration: 0 },
        series: [],
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useKpisQuery>);

    renderWith(<SessionsKpiBlock {...baseProps} comparison={{ kind: "previous-period" }} />);
    expect(screen.getByText(/Sessions/i)).toBeInTheDocument();
  });
});
