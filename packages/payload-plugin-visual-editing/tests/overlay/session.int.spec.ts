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
      editsInPlace: false,
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
    editsInPlace: false,
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

  it("runs instant preview only where visual editing is available", () => {
    const standalonePage = { ...framedPage, isFramed: false };

    expect(sessionOf({ available: true }, framedPage).isInstantPreviewOn).toBe(true);
    expect(sessionOf({ available: false }, framedPage).isInstantPreviewOn).toBe(false);
    expect(
      sessionOf({ available: true, instantPreview: false }, framedPage).isInstantPreviewOn
    ).toBe(false);
    expect(
      sessionOf({ available: true, framedOnly: true }, standalonePage).isInstantPreviewOn
    ).toBe(false);
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

describe("editing on the page", () => {
  const EDITS_IN_PLACE_KEY = "visual-editing-inline";

  const page = {
    editsInPlace: true,
    isFramed: false,
    mode: "hover" as const,
    pageOrigin: "https://site.example",
  };

  it("is off until the editor turns it on", () => {
    const store = createPageStore();

    store.attach(window);

    expect(store.read().editsInPlace).toBe(false);
  });

  it("keeps the choice of the editor between page loads", () => {
    const store = createPageStore();
    store.attach(window);

    store.setEditsInPlace(true);

    expect(localStorage.getItem(EDITS_IN_PLACE_KEY)).toBe("true");
    const reloaded = createPageStore();
    reloaded.attach(window);
    expect(reloaded.read().editsInPlace).toBe(true);
  });

  it("shows outlines on hover when it is turned on while they are off", () => {
    const store = createPageStore();
    store.attach(window);

    store.setEditsInPlace(true);

    expect(store.read().mode).toBe("hover");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("hover");
  });

  it("keeps the mode the editor picked when it is turned on or off", () => {
    const store = createPageStore();
    store.attach(window);
    store.setMode("always");

    store.setEditsInPlace(true);
    store.setEditsInPlace(false);

    expect(store.read()).toMatchObject({ editsInPlace: false, mode: "always" });
    expect(localStorage.getItem(EDITS_IN_PLACE_KEY)).toBe("false");
  });

  it("works on a page whose storage is blocked", () => {
    const store = createPageStore();
    store.attach(pageWithBlockedStorage());

    store.setEditsInPlace(true);

    expect(store.read().editsInPlace).toBe(true);
  });

  it("runs where the site offers it, the editor turned it on and outlines show", () => {
    const options = { available: true, inlineEditing: true };

    expect(sessionOf(options, page).isInlineEditingOn).toBe(true);
    expect(sessionOf(options, { ...page, editsInPlace: false }).isInlineEditingOn).toBe(false);
    expect(sessionOf(options, { ...page, mode: "off" }).isInlineEditingOn).toBe(false);
    expect(sessionOf({ available: true }, page).isInlineEditingOn).toBe(false);
    expect(sessionOf({ ...options, available: false }, page).isInlineEditingOn).toBe(false);
  });

  it("is offered only where visual editing is available", () => {
    expect(sessionOf({ available: true, inlineEditing: true }, page).inlineEditing).toBe(true);
    expect(sessionOf({ available: false, inlineEditing: true }, page).inlineEditing).toBe(false);
    expect(
      sessionOf({ available: true, framedOnly: true, inlineEditing: true }, page).inlineEditing
    ).toBe(false);
  });

  it("saves through the API of the admin origin unless the site names another", () => {
    expect(sessionOf({}, page).payloadApi).toBe("https://site.example/api");
    expect(sessionOf({ adminOrigin: "https://cms.example.com" }, page).payloadApi).toBe(
      "https://cms.example.com/api"
    );
    expect(sessionOf({ payloadApi: "https://cms.example.com/v1" }, page).payloadApi).toBe(
      "https://cms.example.com/v1"
    );
  });
});
