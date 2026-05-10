import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsProvider } from "../../../src/types/provider";
import { installEmailClick } from "../../../src/client/autoTrack/emailClick";

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

describe("installEmailClick", () => {
  it("fires email_click on mailto: anchor click", () => {
    const provider = makeProvider();
    const cleanup = installEmailClick(provider);
    document.body.innerHTML = '<a id="a" href="mailto:hello@example.com">x</a>';
    document.getElementById("a")!.click();
    expect(provider.trackEvent).toHaveBeenCalledWith(
      "email_click",
      expect.objectContaining({ link_url: expect.stringContaining("mailto:hello@example.com") }),
    );
    cleanup();
  });

  it("does not fire on non-mailto anchors", () => {
    const provider = makeProvider();
    const cleanup = installEmailClick(provider);
    document.body.innerHTML = '<a id="a" href="tel:+1">x</a>';
    document.getElementById("a")!.click();
    expect(provider.trackEvent).not.toHaveBeenCalled();
    cleanup();
  });
});
