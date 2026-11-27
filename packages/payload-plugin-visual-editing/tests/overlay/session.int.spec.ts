import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createPageStore,
  DETACHED_PAGE,
  payloadApiOf,
  sessionOf,
  toggledMode,
} from "../../src/client/session";
import { STORAGE_KEY } from "../../src/client/visualEditingMode";
import {
  DATA_VISUAL_EDITING_ADMIN_ATTR,
  LIVE_PREVIEW_FRAME_ID,
  VE_FRAME_HELLO_TYPE,
  VE_FRAME_SETTINGS_TYPE,
} from "../../src/shared/protocol";
import {
  ADMIN_ORIGIN,
  frameTurnedOff,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
  stubFrameElement,
  stubOpenerWindow,
} from "../support/previewWindow";

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
  restorePreviewWindow();
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
      isTurnedOffByFrame: false,
      chosenMode: "hover",
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
    ["nonsense", null],
    [null, null],
  ])("reads a stored %s as the choice %s", (stored, mode) => {
    if (stored !== null) localStorage.setItem(STORAGE_KEY, stored);
    const store = createPageStore();

    store.attach(window);

    expect(store.read().chosenMode).toBe(mode);
  });

  it("stores a chosen mode and tells every subscriber", () => {
    const store = createPageStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.attach(window);

    store.setMode("hover");

    expect(store.read().chosenMode).toBe("hover");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("hover");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("reads no chosen mode on a page whose storage is blocked", () => {
    const store = createPageStore();

    expect(() => store.attach(pageWithBlockedStorage())).not.toThrow();

    expect(store.read().chosenMode).toBeNull();
  });

  it("keeps a chosen mode for the page when its storage is blocked", () => {
    const store = createPageStore();
    store.attach(pageWithBlockedStorage());

    expect(() => store.setMode("always")).not.toThrow();

    expect(store.read().chosenMode).toBe("always");
  });

  it("keeps a chosen mode for the page when its storage is full", () => {
    const store = createPageStore();
    store.attach(window);
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    expect(() => store.setMode("hover")).not.toThrow();
    setItem.mockRestore();

    expect(store.read().chosenMode).toBe("hover");
  });

  it("stops telling a subscriber that unsubscribed", () => {
    const store = createPageStore();
    const listener = vi.fn();
    store.subscribe(listener)();

    store.attach(window);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("page store in a frame that turns visual editing off", () => {
  const stops: (() => void)[] = [];

  const attached = () => {
    const store = createPageStore();
    store.attach(window);
    stops.push(store.hearItsFrame(window, () => ADMIN_ORIGIN));
    return store;
  };

  const settings = (visualEditing: string) => ({ type: VE_FRAME_SETTINGS_TYPE, visualEditing });

  afterEach(() => {
    for (const stop of stops.splice(0)) stop();
  });

  it("reads the attribute of a frame of its own origin as soon as it is attached", () => {
    stubFrameElement(frameTurnedOff());

    expect(attached().read().isTurnedOffByFrame).toBe(true);
  });

  it("reads the Live Preview frame of its own origin as one that leaves it on", () => {
    const frame = document.createElement("iframe");
    frame.id = LIVE_PREVIEW_FRAME_ID;
    stubFrameElement(frame);

    expect(attached().read().isTurnedOffByFrame).toBe(false);
  });

  it("reads any other frame of the admin without the attribute as one that turns it off", () => {
    document.documentElement.setAttribute(DATA_VISUAL_EDITING_ADMIN_ATTR, "");
    stubFrameElement(document.createElement("iframe"));

    expect(attached().read().isTurnedOffByFrame).toBe(true);
    document.documentElement.removeAttribute(DATA_VISUAL_EDITING_ADMIN_ATTR);
  });

  it("stays on in a frame of its own origin that is not the admin", () => {
    stubFrameElement(document.createElement("iframe"));

    expect(attached().read().isTurnedOffByFrame).toBe(false);
  });

  it("asks nothing of its frame from an opaque origin, such as a sandboxed iframe", () => {
    const postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });

    stops.push(createPageStore().hearItsFrame(window, () => "null"));

    expect(postToAdmin).not.toHaveBeenCalled();
  });

  it("stays on in a frame of another origin until the admin answers", () => {
    stubFrameElement(null);

    expect(attached().read().isTurnedOffByFrame).toBe(false);
  });

  it("asks the admin about its frame and follows the answer", () => {
    const postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });
    const store = attached();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(postToAdmin).toHaveBeenCalledWith({ type: VE_FRAME_HELLO_TYPE }, ADMIN_ORIGIN);
    expect(store.read().isTurnedOffByFrame).toBe(false);

    postFromAdmin(settings("off"));
    expect(store.read().isTurnedOffByFrame).toBe(true);
    expect(listener).toHaveBeenCalledOnce();

    postFromAdmin(settings("on"));
    expect(store.read().isTurnedOffByFrame).toBe(false);
  });

  it("ignores frame settings from another origin or another window", () => {
    stubAdminWindow({ postMessage: vi.fn() });
    const store = attached();

    postFromAdmin(settings("off"), { origin: "https://elsewhere.example" });
    postFromAdmin(settings("off"), { source: {} });

    expect(store.read().isTurnedOffByFrame).toBe(false);
  });

  it("stops hearing the admin once it is detached", () => {
    stubAdminWindow({ postMessage: vi.fn() });
    const store = createPageStore();
    store.attach(window);
    store.hearItsFrame(window, () => ADMIN_ORIGIN)();

    postFromAdmin(settings("off"));

    expect(store.read().isTurnedOffByFrame).toBe(false);
  });

  it("asks nothing in a window of its own", () => {
    const postToOpener = vi.fn();
    stubOpenerWindow({ closed: false, postMessage: postToOpener });

    attached();

    expect(postToOpener).not.toHaveBeenCalled();
  });
});

const NO_ORIGINS = ["cms.example.com", "localhost:3000", "//cms.example.com", "file:///cms"];

describe("session", () => {
  const framedPage = {
    isFramed: true,
    isTurnedOffByFrame: false,
    chosenMode: "always" as const,
    pageOrigin: "https://site.example",
  };

  it("is available only when the site makes it available", () => {
    expect(sessionOf({}, framedPage).available).toBe(false);
    expect(sessionOf({ available: true }, framedPage).available).toBe(true);
  });

  it("is not available in a frame that turns it off, with nothing to preview or edit", () => {
    const turnedOff = { ...framedPage, isTurnedOffByFrame: true };

    expect(sessionOf({ available: true, inlineEditing: true }, turnedOff)).toMatchObject({
      available: false,
      enabled: false,
      inlineEditing: false,
      isInstantPreviewOn: false,
    });
  });

  it("is not available outside a frame when it is framed only", () => {
    const standalone = { ...framedPage, isFramed: false };

    expect(sessionOf({ available: true, framedOnly: true }, standalone).available).toBe(false);
    expect(sessionOf({ available: true, framedOnly: true }, framedPage).available).toBe(true);
  });

  it("is enabled when available and the mode is not off", () => {
    expect(sessionOf({ available: true }, framedPage).enabled).toBe(true);
    expect(sessionOf({ available: true }, { ...framedPage, chosenMode: "off" }).enabled).toBe(
      false
    );
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
  const page = {
    isFramed: false,
    isTurnedOffByFrame: false,
    chosenMode: "hover" as const,
    pageOrigin: "https://site.example",
  };

  it("runs in every mode but Off where the site offers it", () => {
    const options = { available: true, inlineEditing: true };

    expect(sessionOf(options, page).isInlineEditingOn).toBe(true);
    expect(sessionOf(options, { ...page, chosenMode: "always" }).isInlineEditingOn).toBe(true);
    expect(sessionOf(options, { ...page, chosenMode: "off" }).isInlineEditingOn).toBe(false);
    expect(sessionOf({ available: true }, page).isInlineEditingOn).toBe(false);
    expect(sessionOf({ ...options, available: false }, page).isInlineEditingOn).toBe(false);
  });

  it("runs as soon as the page is attached in a mode but Off, whatever an older page stored for it", () => {
    localStorage.setItem(STORAGE_KEY, "hover");
    localStorage.setItem("visual-editing-inline", "false");
    const store = createPageStore();

    store.attach(window);

    expect(
      sessionOf({ available: true, inlineEditing: true }, store.read()).isInlineEditingOn
    ).toBe(true);
  });

  it("starts on Hover where the site offers it and the editor chose no mode yet", () => {
    const store = createPageStore();

    store.attach(window);

    expect(sessionOf({ available: true, inlineEditing: true }, store.read())).toMatchObject({
      isInlineEditingOn: true,
      mode: "hover",
    });
  });

  it("starts on Off where the site does not offer it and the editor chose no mode yet", () => {
    const store = createPageStore();

    store.attach(window);

    expect(sessionOf({ available: true }, store.read())).toMatchObject({
      enabled: false,
      mode: "off",
    });
  });

  it("stays on Off where the editor chose Off", () => {
    localStorage.setItem(STORAGE_KEY, "off");
    const store = createPageStore();

    store.attach(window);

    expect(sessionOf({ available: true, inlineEditing: true }, store.read())).toMatchObject({
      isInlineEditingOn: false,
      mode: "off",
    });
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
