import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsProvider } from "../../../src/types/provider";
import { installTelegramClick, installWhatsappClick } from "../../../src/client/autoTrack/messengerClick";

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

describe("installWhatsappClick", () => {
  it.each(["https://wa.me/1234", "https://api.whatsapp.com/send?phone=1"])(
    "fires whatsapp_click on %s",
    (href) => {
      const provider = makeProvider();
      const cleanup = installWhatsappClick(provider);
      document.body.innerHTML = `<a id="a" href="${href}">x</a>`;
      document.getElementById("a")!.click();
      expect(provider.trackEvent).toHaveBeenCalledWith("whatsapp_click", expect.any(Object));
      cleanup();
    },
  );

  it("does not fire on telegram links", () => {
    const provider = makeProvider();
    const cleanup = installWhatsappClick(provider);
    document.body.innerHTML = '<a id="a" href="https://t.me/foo">x</a>';
    document.getElementById("a")!.click();
    expect(provider.trackEvent).not.toHaveBeenCalled();
    cleanup();
  });
});

describe("installTelegramClick", () => {
  it.each(["https://t.me/foo", "https://telegram.me/bar"])("fires telegram_click on %s", (href) => {
    const provider = makeProvider();
    const cleanup = installTelegramClick(provider);
    document.body.innerHTML = `<a id="a" href="${href}">x</a>`;
    document.getElementById("a")!.click();
    expect(provider.trackEvent).toHaveBeenCalledWith("telegram_click", expect.any(Object));
    cleanup();
  });

  it("does not fire on whatsapp links", () => {
    const provider = makeProvider();
    const cleanup = installTelegramClick(provider);
    document.body.innerHTML = '<a id="a" href="https://wa.me/1">x</a>';
    document.getElementById("a")!.click();
    expect(provider.trackEvent).not.toHaveBeenCalled();
    cleanup();
  });
});
