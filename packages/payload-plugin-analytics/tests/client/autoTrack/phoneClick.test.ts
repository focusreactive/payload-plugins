import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsProvider } from "../../../src/types/provider";
import { installPhoneClick } from "../../../src/client/autoTrack/phoneClick";

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

describe("installPhoneClick", () => {
  it("fires lead_action with fr_lead_type=phone_click on tel: anchor click", () => {
    const provider = makeProvider();
    const cleanup = installPhoneClick(provider);
    document.body.innerHTML = '<a id="a" href="tel:+1234567890">call</a>';
    document.querySelector("#a")!.click();
    expect(provider.trackEvent).toHaveBeenCalledWith(
      "lead_action",
      expect.objectContaining({
        fr_lead_type: "phone_click",
        link_url: expect.stringContaining("tel:+1234567890"),
      })
    );
    cleanup();
  });

  it("fires when click bubbles from inline child of tel: anchor", () => {
    const provider = makeProvider();
    const cleanup = installPhoneClick(provider);
    document.body.innerHTML = '<a href="tel:+1"><span id="inner">x</span></a>';
    document.querySelector("#inner")!.click();
    expect(provider.trackEvent).toHaveBeenCalled();
    cleanup();
  });

  it("does not fire when ancestor has data-analytics-skip", () => {
    const provider = makeProvider();
    const cleanup = installPhoneClick(provider);
    document.body.innerHTML = '<div data-analytics-skip="1"><a id="a" href="tel:+1">x</a></div>';
    document.querySelector("#a")!.click();
    expect(provider.trackEvent).not.toHaveBeenCalled();
    cleanup();
  });

  it("does not fire on non-tel anchors", () => {
    const provider = makeProvider();
    const cleanup = installPhoneClick(provider);
    document.body.innerHTML = '<a id="a" href="https://example.com">x</a>';
    document.querySelector("#a")!.click();
    expect(provider.trackEvent).not.toHaveBeenCalled();
    cleanup();
  });

  it("cleanup removes the listener", () => {
    const provider = makeProvider();
    const cleanup = installPhoneClick(provider);
    cleanup();
    document.body.innerHTML = '<a id="a" href="tel:+1">x</a>';
    document.querySelector("#a")!.click();
    expect(provider.trackEvent).not.toHaveBeenCalled();
  });
});
