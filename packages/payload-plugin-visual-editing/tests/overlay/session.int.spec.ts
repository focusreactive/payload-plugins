import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createPageStore,
  DETACHED_PAGE,
  payloadApiOf,
  sessionOf,
  toggledMode,
} from "../../src/client/session";
import { STORAGE_KEY } from "../../src/client/visualEditingMode";

const originalTop = window.top;

const setFramed = (framed: boolean) =>
  Object.defineProperty(window, "top", {
    configurable: true,
    value: framed ? ({} as Window) : window,
  });

const pageWithBlockedStorage = (): Window =>
  new Proxy(window, {
    get: (page, property) => {
      if (property === "localStorage") throw new DOMException("denied", "SecurityError");
      return Reflect.get(page, property) as unknown;
    },
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

  it("reads the mode as off on a page whose storage is blocked", () => {
    const store = createPageStore();

    expect(() => store.attach(pageWithBlockedStorage())).not.toThrow();

    expect(store.read().mode).toBe("off");
  });

  it("keeps a chosen mode for the page when its storage is blocked", () => {
    const store = createPageStore();
    store.attach(pageWithBlockedStorage());

    expect(() => store.setMode("always")).not.toThrow();

    expect(store.read().mode).toBe("always");
  });

  it("keeps a chosen mode for the page when its storage is full", () => {
    const store = createPageStore();
    store.attach(window);
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    expect(() => store.setMode("hover")).not.toThrow();
    setItem.mockRestore();

    expect(store.read().mode).toBe("hover");
  });

  it("stops telling a subscriber that unsubscribed", () => {
    const store = createPageStore();
    const listener = vi.fn();
    store.subscribe(listener)();

    store.attach(window);

    expect(listener).not.toHaveBeenCalled();
  });
});

const NO_ORIGINS = ["cms.example.com", "localhost:3000", "//cms.example.com", "file:///cms"];

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

  it("takes the origin out of an admin address that names more than the origin", () => {
    expect(sessionOf({ adminOrigin: "https://cms.example/admin/" }, framedPage).adminOrigin).toBe(
      "https://cms.example"
    );
  });

  it.each(NO_ORIGINS)(
    "takes the origin of the page for the admin origin %s, which is no origin",
    (adminOrigin) => {
      expect(sessionOf({ adminOrigin }, framedPage).adminOrigin).toBe("https://site.example");
    }
  );

  it.each(NO_ORIGINS)(
    "knows no API of Payload below the admin origin %s, which is no origin",
    (adminOrigin) => {
      expect(payloadApiOf({ adminOrigin })).toBeUndefined();
    }
  );

  it("has instant preview on unless the site turns it off", () => {
    expect(sessionOf({}, framedPage).instantPreview).toBe(true);
    expect(sessionOf({ instantPreview: false }, framedPage).instantPreview).toBe(false);
  });

  it("finds the API of Payload below the admin origin the site names", () => {
    expect(payloadApiOf({ adminOrigin: "https://cms.example" })).toBe("https://cms.example/api");
    expect(payloadApiOf({ adminOrigin: "https://cms.example/" })).toBe("https://cms.example/api");
  });

  it("takes the API of Payload the site names before the one below the admin origin", () => {
    const payloadApi = "https://api.example/payload";

    expect(payloadApiOf({ adminOrigin: "https://cms.example", payloadApi })).toBe(payloadApi);
    expect(payloadApiOf({ adminOrigin: "https://cms.example", payloadApi: "" })).toBe("");
  });

  it("knows no API of Payload for a site that names neither", () => {
    expect(payloadApiOf({})).toBeUndefined();
  });

  it("toggles between off and always", () => {
    expect(toggledMode("off")).toBe("always");
    expect(toggledMode("hover")).toBe("off");
  });
});
