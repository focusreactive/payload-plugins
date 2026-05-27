import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsProvider } from "../../../src/types/provider";
import { installFormSubmit } from "../../../src/client/autoTrack/formSubmit";

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

describe("installFormSubmit", () => {
  it("fires lead_action with fr_lead_type=form_submit on submit event", () => {
    const provider = makeProvider();
    const cleanup = installFormSubmit(provider);
    document.body.innerHTML = '<form id="f" name="newsletter"><button type="submit">x</button></form>';
    const form = document.getElementById("f") as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(provider.trackEvent).toHaveBeenCalledWith(
      "lead_action",
      expect.objectContaining({
        fr_lead_type: "form_submit",
        form_id: "f",
        form_name: "newsletter",
      }),
    );
    cleanup();
  });

  it("does not fire when form is inside data-analytics-skip", () => {
    const provider = makeProvider();
    const cleanup = installFormSubmit(provider);
    document.body.innerHTML =
      '<div data-analytics-skip="1"><form id="f"><button type="submit">x</button></form></div>';
    const form = document.getElementById("f") as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(provider.trackEvent).not.toHaveBeenCalled();
    cleanup();
  });
});
