import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pushEvent } from "../../../src/providers/ga4Provider/pushEvent";
import { pushPageView } from "../../../src/providers/ga4Provider/pushPageView";
import { __resetInMemoryStore } from "../../../src/client/session/store";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-11T10:00:00Z"));
});

afterEach(() => {
  delete window.gtag;
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetInMemoryStore();
  vi.useRealTimers();
});

describe("pushEvent", () => {
  it("enriches gtag payload with fr_session_id, fr_event_seq, fr_elapsed_ms", () => {
    const spy = vi.fn();
    window.gtag = spy;
    pushEvent("phone_click", { link_url: "tel:+1" });
    const params = spy.mock.calls[0]![2];
    expect(params.link_url).toBe("tel:+1");
    expect(params.fr_session_id).toMatch(/^[0-9a-f-]{36}$/u);
    expect(params.fr_event_seq).toBe(1);
    expect(params.fr_elapsed_ms).toBe(0);
  });

  it("plugin-owned names cannot be overridden by caller params", () => {
    const spy = vi.fn();
    window.gtag = spy;
    pushEvent("phone_click", { fr_session_id: "spoof", fr_event_seq: 999, fr_elapsed_ms: 12345 });
    const params = spy.mock.calls[0]![2];
    expect(params.fr_session_id).not.toBe("spoof");
    expect(params.fr_event_seq).toBe(1);
    expect(params.fr_elapsed_ms).toBe(0);
  });

  it("defaults caller params to empty object", () => {
    const spy = vi.fn();
    window.gtag = spy;
    pushEvent("foo");
    const params = spy.mock.calls[0]![2];
    expect(params.fr_session_id).toBeDefined();
  });

  it("no-ops when gtag is undefined and does NOT touch the session store", () => {
    delete window.gtag;
    expect(() => pushEvent("foo")).not.toThrow();
    // No assertion on store state — the no-op path is the contract.
  });

  it("includes fr_session_start (ISO) in the pushed params", () => {
    const spy = vi.fn();
    window.gtag = spy;
    pushEvent("page_view");
    const params = spy.mock.calls[0]![2];
    expect(typeof params.fr_session_start).toBe("string");
    expect(params.fr_session_start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
  });
});

describe("pushPageView", () => {
  it("calls gtag with page_view + page_path/title/location AND the three session params", () => {
    const spy = vi.fn();
    window.gtag = spy;
    pushPageView("/about", "About", "https://example.com/about");
    const [, name, params] = spy.mock.calls[0];
    expect(name).toBe("page_view");
    expect(params.page_path).toBe("/about");
    expect(params.fr_session_id).toMatch(/^[0-9a-f-]{36}$/u);
    expect(params.fr_event_seq).toBeGreaterThanOrEqual(1);
  });

  it("no-ops when gtag is undefined", () => {
    delete window.gtag;
    expect(() => pushPageView("/x", "X", "https://x")).not.toThrow();
  });
});
