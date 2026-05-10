import { afterEach, describe, expect, it, vi } from "vitest";
import { pushEvent } from "../../../src/providers/ga4Provider/pushEvent";
import { pushPageView } from "../../../src/providers/ga4Provider/pushPageView";

afterEach(() => {
  delete window.gtag;
});

describe("pushEvent", () => {
  it("calls window.gtag with 'event' + name + params", () => {
    const spy = vi.fn();
    window.gtag = spy;
    pushEvent("phone_click", { link_url: "tel:+1" });
    expect(spy).toHaveBeenCalledWith("event", "phone_click", { link_url: "tel:+1" });
  });

  it("defaults params to empty object", () => {
    const spy = vi.fn();
    window.gtag = spy;
    pushEvent("foo");
    expect(spy).toHaveBeenCalledWith("event", "foo", {});
  });

  it("no-ops when gtag is undefined", () => {
    delete window.gtag;
    expect(() => pushEvent("foo")).not.toThrow();
  });
});

describe("pushPageView", () => {
  it("calls gtag with 'event','page_view',{page_path,page_title,page_location}", () => {
    const spy = vi.fn();
    window.gtag = spy;
    pushPageView("/about", "About", "https://example.com/about");
    expect(spy).toHaveBeenCalledWith("event", "page_view", {
      page_path: "/about",
      page_title: "About",
      page_location: "https://example.com/about",
    });
  });

  it("no-ops when gtag is undefined", () => {
    delete window.gtag;
    expect(() => pushPageView("/x", "X", "https://x")).not.toThrow();
  });
});
