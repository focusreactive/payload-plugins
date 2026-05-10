import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsProvider } from "../../../src/types/provider";
import { installDirectionsClick } from "../../../src/client/autoTrack/directionsClick";

afterEach(() => {
  document.body.innerHTML = "";
});

function makeProvider(): AnalyticsProvider {
  return {
    name: "fake",
    Scripts: () => null,
    trackEvent: vi.fn(),
    pageView: vi.fn(),
  };
}

describe("installDirectionsClick", () => {
  it.each([
    "https://www.google.com/maps/place/Foo",
    "https://google.com/maps/?q=foo",
    "https://maps.app.goo.gl/abc",
    "https://goo.gl/maps/xyz",
  ])("fires directions_click on %s", (href) => {
    const provider = makeProvider();
    const cleanup = installDirectionsClick(provider);
    document.body.innerHTML = `<a id="a" href="${href}">x</a>`;
    document.getElementById("a")!.click();
    expect(provider.trackEvent).toHaveBeenCalledWith(
      "directions_click",
      expect.objectContaining({ link_url: expect.stringContaining(href) }),
    );
    cleanup();
  });

  it("does not fire on non-maps URLs", () => {
    const provider = makeProvider();
    const cleanup = installDirectionsClick(provider);
    document.body.innerHTML = '<a id="a" href="https://example.com/maps">x</a>';
    document.getElementById("a")!.click();
    expect(provider.trackEvent).not.toHaveBeenCalled();
    cleanup();
  });

  it("does not throw on relative or unparsable href", () => {
    const provider = makeProvider();
    const cleanup = installDirectionsClick(provider);
    document.body.innerHTML = '<a id="a" href="#">x</a>';
    expect(() => document.getElementById("a")!.click()).not.toThrow();
    expect(provider.trackEvent).not.toHaveBeenCalled();
    cleanup();
  });
});
