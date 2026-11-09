import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyticsShell } from "../../../src/components/AnalyticsView/AnalyticsShell";
import { resolveLayout } from "../../../src/services/layout/resolveLayout";
import type { AnalyticsPluginConfig } from "../../../src/types/config";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin/analytics",
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

const baseConfig: AnalyticsPluginConfig = {
  ga4: {
    propertyId: "1",
    measurementId: "G-X",
    serviceAccount: { clientEmail: "x", privateKey: "x" },
  },
};

const { resolved, registry } = resolveLayout(baseConfig);
const clientRegistry = Object.fromEntries(
  Object.entries(registry).map(([id, def]) => [id, { hasFetch: Boolean(def.fetch) }])
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AnalyticsShell", () => {
  it("renders page title, FilterBar, RefreshButton, and the Overview tab by default", () => {
    // Stub fetch so the wrappers' queries don't blow up jsdom.
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({}, { headers: { "Content-Type": "application/json" } }))
    );

    render(<AnalyticsShell title="Analytics" layout={resolved} clientRegistry={clientRegistry} />);
    expect(screen.getByRole("heading", { name: /Analytics/iu })).toBeInTheDocument();
    expect(screen.getByRole("tab", { selected: true })).toHaveTextContent("Overview");
    expect(screen.getByRole("button", { name: /Refresh/iu })).toBeInTheDocument();
  });
});
