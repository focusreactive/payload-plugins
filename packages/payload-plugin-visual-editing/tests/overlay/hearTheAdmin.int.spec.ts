import { afterEach, describe, expect, it, vi } from "vitest";

import { hearTheAdmin } from "../../src/client/adminWindow";
import { listenToSaves } from "../../src/client/saveEvents";
import { VE_DOCUMENT_SAVED_TYPE } from "../../src/shared/protocol";

import {
  ADMIN_ORIGIN,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
  stubOpenerWindow,
} from "../support/previewWindow";

const SAVED = {
  collectionSlug: "page",
  docId: "1",
  kind: "collection",
  type: VE_DOCUMENT_SAVED_TYPE,
};

describe("what the page hears of the admin", () => {
  const stops: (() => void)[] = [];

  const hear = (adminOrigin = ADMIN_ORIGIN) => {
    const heard = vi.fn();
    stops.push(hearTheAdmin(window, () => adminOrigin, heard));
    return heard;
  };

  afterEach(() => {
    for (const stop of stops.splice(0)) stop();
    restorePreviewWindow();
  });

  it("hears a message of the admin window on the admin origin", () => {
    stubAdminWindow({ postMessage: vi.fn() });
    const heard = hear();

    postFromAdmin(SAVED);

    expect(heard).toHaveBeenCalledWith(SAVED);
  });

  it("ignores another origin, another window and what is no object", () => {
    stubAdminWindow({ postMessage: vi.fn() });
    const heard = hear();

    postFromAdmin(SAVED, { origin: "https://elsewhere.example" });
    postFromAdmin(SAVED, { source: {} });
    postFromAdmin("saved");

    expect(heard).not.toHaveBeenCalled();
  });

  it("hears the window that opened the page", () => {
    const opener = { closed: false, postMessage: vi.fn() };
    stubOpenerWindow(opener);
    const heard = hear();

    postFromAdmin(SAVED, { source: opener });

    expect(heard).toHaveBeenCalledWith(SAVED);
  });

  it("hears the origin of the page when it was given no admin origin, for saves as well", () => {
    stubAdminWindow({ postMessage: vi.fn() });
    const heard = hear("");
    const saved = vi.fn();
    stops.push(listenToSaves(() => "", saved));

    postFromAdmin(SAVED, { origin: window.location.origin });

    expect(heard).toHaveBeenCalledWith(SAVED);
    expect(saved).toHaveBeenCalledWith({ collectionSlug: "page", docId: "1", kind: "collection" });
  });

  it("stops hearing once it is stopped", () => {
    stubAdminWindow({ postMessage: vi.fn() });
    const heard = hear();
    for (const stop of stops.splice(0)) stop();

    postFromAdmin(SAVED);

    expect(heard).not.toHaveBeenCalled();
  });
});
