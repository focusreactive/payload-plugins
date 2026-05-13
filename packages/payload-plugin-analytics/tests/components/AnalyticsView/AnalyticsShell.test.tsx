import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyticsShell } from "../../../src/components/AnalyticsView/AnalyticsShell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin/analytics",
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AnalyticsShell", () => {
  it("renders page title, FilterBar, RefreshButton, and the Overview tab by default", () => {
    // Stub fetch so the wrappers' queries don't blow up jsdom.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { headers: { "Content-Type": "application/json" } })),
    );

    render(<AnalyticsShell title="Analytics" />);
    expect(screen.getByRole("heading", { name: /Analytics/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { selected: true })).toHaveTextContent("Overview");
    expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
  });
});
