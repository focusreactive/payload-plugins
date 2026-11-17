import { afterEach, describe, expect, it, vi } from "vitest";

import { createPageStore, DETACHED_PAGE, sessionOf, toggledMode } from "../../src/client/session";
import { STORAGE_KEY } from "../../src/client/visualEditingMode";

const originalTop = window.top;

const setFramed = (framed: boolean) =>
  Object.defineProperty(window, "top", {
    configurable: true,
    value: framed ? ({} as Window) : window,
  });

afterEach(() => {
  Object.defineProperty(window, "top", { configurable: true, value: originalTop });
  localStorage.clear();
});

describe("page store", () => {
  it("reads nothing of the page until it is attached", () => {
    localStorage.setItem(STORAGE_KEY, "always");

    expect(createPageStore().read()).toBe(DETACHED_PAGE);
  });

  it("reads the stored mode, the frame and the origin of the page it is attached to", () => {
    setFramed(true);
    localStorage.setItem(STORAGE_KEY, "hover");
    const store = createPageStore();

    store.attach(window);

    expect(store.read()).toEqual({
      isFramed: true,
      mode: "hover",
      pageOrigin: window.location.origin,
    });
  });

  it("counts a window the admin opened as a preview, as Payload does with its popup", () => {
    setFramed(false);
    Object.defineProperty(window, "opener", { configurable: true, value: { closed: false } });
    const store = createPageStore();

    store.attach(window);
    Object.defineProperty(window, "opener", { configurable: true, value: null });

    expect(store.read().isFramed).toBe(true);
  });

  it.each([
    ["true", "always"],
    ["nonsense", "off"],
    [null, "off"],
  ])("reads a stored %s as %s", (stored, mode) => {
    if (stored !== null) localStorage.setItem(STORAGE_KEY, stored);
    const store = createPageStore();

    store.attach(window);

    expect(store.read().mode).toBe(mode);
  });

  it("stores a chosen mode and tells every subscriber", () => {
    const store = createPageStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.attach(window);

    store.setMode("hover");

    expect(store.read().mode).toBe("hover");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("hover");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("stops telling a subscriber that unsubscribed", () => {
    const store = createPageStore();
    const listener = vi.fn();
    store.subscribe(listener)();

    store.attach(window);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("session", () => {
  const framedPage = {
    isFramed: true,
    mode: "always" as const,
    pageOrigin: "https://site.example",
  };

  it("is available only when the site makes it available", () => {
    expect(sessionOf({}, framedPage).available).toBe(false);
    expect(sessionOf({ available: true }, framedPage).available).toBe(true);
  });

  it("is not available outside a frame when it is framed only", () => {
    const standalone = { ...framedPage, isFramed: false };

    expect(sessionOf({ available: true, framedOnly: true }, standalone).available).toBe(false);
    expect(sessionOf({ available: true, framedOnly: true }, framedPage).available).toBe(true);
  });

  it("is enabled when available and the mode is not off", () => {
    expect(sessionOf({ available: true }, framedPage).enabled).toBe(true);
    expect(sessionOf({ available: true }, { ...framedPage, mode: "off" }).enabled).toBe(false);
  });

  it("takes the admin origin of the site, else the origin of the page", () => {
    expect(sessionOf({}, framedPage).adminOrigin).toBe("https://site.example");
    expect(sessionOf({ adminOrigin: "https://cms.example" }, framedPage).adminOrigin).toBe(
      "https://cms.example"
    );
  });

  it("toggles between off and always", () => {
    expect(toggledMode("off")).toBe("always");
    expect(toggledMode("hover")).toBe("off");
  });
});
