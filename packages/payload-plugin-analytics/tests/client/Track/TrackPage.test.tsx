import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { AnalyticsProvider } from "../../../src/client/AnalyticsProvider";
import { TrackPage } from "../../../src/client/Track/TrackPage";
import { getPageContext, clearPageContext } from "../../../src/client/pageContext/store";
import type { AnalyticsProvider as Adapter } from "../../../src/types/provider";

function makeProvider(): Adapter & { pageView: ReturnType<typeof vi.fn> } {
  return {
    name: "test",
    Scripts: () => null,
    trackEvent: vi.fn(),
    pageView: vi.fn(),
  };
}

describe("TrackPage", () => {
  beforeEach(() => clearPageContext());
  afterEach(() => clearPageContext());

  it("sets ambient page context then fires a pageView with the current path", () => {
    const provider = makeProvider();
    render(
      <AnalyticsProvider provider={provider} trackRouteChanges={false}>
        <TrackPage pageRef="page:42" locale="en" path="/about" />
      </AnalyticsProvider>
    );
    expect(getPageContext()).toEqual({ pageRef: "page:42", locale: "en" });
    expect(provider.pageView).toHaveBeenCalledWith("/about");
  });

  it("derives the ref from collection + id", () => {
    const provider = makeProvider();
    render(
      <AnalyticsProvider provider={provider} trackRouteChanges={false}>
        <TrackPage collection="posts" id={7} locale="es" path="/es/blog/x" />
      </AnalyticsProvider>
    );
    expect(getPageContext()).toEqual({ pageRef: "posts:7", locale: "es" });
  });

  it("does nothing when enabled=false (draft/preview)", () => {
    const provider = makeProvider();
    render(
      <AnalyticsProvider provider={provider} trackRouteChanges={false}>
        <TrackPage pageRef="page:42" locale="en" path="/about" enabled={false} />
      </AnalyticsProvider>
    );
    expect(getPageContext()).toBeNull();
    expect(provider.pageView).not.toHaveBeenCalled();
  });
});
