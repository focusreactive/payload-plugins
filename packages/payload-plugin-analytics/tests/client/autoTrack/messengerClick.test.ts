import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsProvider } from "../../../src/types/provider";
import {
  installTelegramClick,
  installWhatsappClick,
} from "../../../src/client/autoTrack/messengerClick";

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
    "fires lead_action with fr_lead_type=whatsapp_click on %s",
    (href) => {
      const provider = makeProvider();
      const cleanup = installWhatsappClick(provider);
      document.body.innerHTML = `<a id="a" href="${href}">x</a>`;
      document.querySelector("#a")!.click();
      expect(provider.trackEvent).toHaveBeenCalledWith(
        "lead_action",
        expect.objectContaining({ fr_lead_type: "whatsapp_click" })
      );
      cleanup();
    }
  );

  it("does not fire on telegram links", () => {
    const provider = makeProvider();
    const cleanup = installWhatsappClick(provider);
    document.body.innerHTML = '<a id="a" href="https://t.me/foo">x</a>';
    document.querySelector("#a")!.click();
    expect(provider.trackEvent).not.toHaveBeenCalled();
    cleanup();
  });
});

describe("installTelegramClick", () => {
  it.each(["https://t.me/foo", "https://telegram.me/bar"])(
    "fires lead_action with fr_lead_type=telegram_click on %s",
    (href) => {
      const provider = makeProvider();
      const cleanup = installTelegramClick(provider);
      document.body.innerHTML = `<a id="a" href="${href}">x</a>`;
      document.querySelector("#a")!.click();
      expect(provider.trackEvent).toHaveBeenCalledWith(
        "lead_action",
        expect.objectContaining({ fr_lead_type: "telegram_click" })
      );
      cleanup();
    }
  );

  it("does not fire on whatsapp links", () => {
    const provider = makeProvider();
    const cleanup = installTelegramClick(provider);
    document.body.innerHTML = '<a id="a" href="https://wa.me/1">x</a>';
    document.querySelector("#a")!.click();
    expect(provider.trackEvent).not.toHaveBeenCalled();
    cleanup();
  });
});
