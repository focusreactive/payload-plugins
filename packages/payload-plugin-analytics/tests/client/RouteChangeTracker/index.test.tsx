import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsProvider } from "../../../src/types/provider";
import { RouteChangeTracker } from "../../../src/client/RouteChangeTracker/index";

let mockPathname = "/";
let mockSearch = "";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

beforeEach(() => {
  mockPathname = "/";
  mockSearch = "";
});

afterEach(() => vi.restoreAllMocks());

function makeProvider(): AnalyticsProvider {
  return {
    name: "fake",
    Scripts: () => null,
    trackEvent: vi.fn(),
    pageView: vi.fn(),
  };
}

describe("<RouteChangeTracker>", () => {
  it("fires one pageView on initial mount", () => {
    const provider = makeProvider();
    render(<RouteChangeTracker provider={provider} />);
    expect(provider.pageView).toHaveBeenCalledTimes(1);
    expect(provider.pageView).toHaveBeenCalledWith("/");
  });

  it("fires once per pathname change", () => {
    const provider = makeProvider();
    const { rerender } = render(<RouteChangeTracker provider={provider} />);
    mockPathname = "/about";
    rerender(<RouteChangeTracker provider={provider} />);
    expect(provider.pageView).toHaveBeenCalledTimes(2);
    expect(provider.pageView).toHaveBeenLastCalledWith("/about");
  });

  it("does not fire on searchParams-only change with same pathname", () => {
    const provider = makeProvider();
    const { rerender } = render(<RouteChangeTracker provider={provider} />);
    mockSearch = "tag=foo";
    rerender(<RouteChangeTracker provider={provider} />);
    expect(provider.pageView).toHaveBeenCalledTimes(1);
  });

  it("includes search in path payload when present on pathname change", () => {
    const provider = makeProvider();
    mockPathname = "/blog";
    mockSearch = "tag=foo";
    render(<RouteChangeTracker provider={provider} />);
    expect(provider.pageView).toHaveBeenCalledWith("/blog?tag=foo");
  });
});
