import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsShell } from "../../../src/components/AnalyticsView/AnalyticsShell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin/analytics",
}));

describe("AnalyticsShell", () => {
  it("renders page title, FilterBar, and the Overview tab by default", () => {
    render(<AnalyticsShell title="Analytics" />);
    expect(screen.getByRole("heading", { name: /Analytics/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { selected: true })).toHaveTextContent("Overview");
  });
});
