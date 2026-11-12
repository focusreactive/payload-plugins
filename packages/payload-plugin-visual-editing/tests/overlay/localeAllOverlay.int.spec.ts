import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Overlay, OverlayCtx } from "../../src/client/createOverlay";

import { DATA_VE_TARGET_ATTR } from "../../src/client/overlay/constants";
import { createOverlay } from "../../src/client/createOverlay";
import {
  VE_FIELD_SNAPSHOT_TYPE,
  VE_MESSAGE_TYPE,
  VE_FIELDS_RENDERED_TYPE,
} from "../../src/shared/protocol";

import { markedText } from "../support/markedData";
import { click, overlayCtx } from "../support/overlay";
import {
  ADMIN_ORIGIN,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
} from "../support/previewWindow";

const buildAdminEditUrl = vi.fn(
  ({ locale, path }: { locale?: string; path: string }) => `/admin/edit?path=${path}&in=${locale}`
);

const ctx = overlayCtx({ buildAdminEditUrl, locale: "en" });

const titleIn = (locale: string, text: string) =>
  markedText(text, {
    collectionSlug: "page",
    docId: "1",
    kind: "collection",
    locale,
    path: "title",
  });

describe("a page that renders a field in every locale", () => {
  let main: HTMLElement;
  let english: HTMLElement;
  let german: HTMLElement;
  let overlay: Overlay;
  let postToAdmin: ReturnType<typeof vi.fn>;

  const start = (overrides: Partial<OverlayCtx> = {}) => {
    overlay = createOverlay(main, () => ({ ...ctx, ...overrides }));
  };

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    english = document.createElement("h1");
    english.textContent = titleIn("en", "Home");
    german = document.createElement("h1");
    german.textContent = titleIn("de", "Start");
    main.append(english, german);
    document.body.append(main);
    postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });
  });

  afterEach(() => {
    overlay.dispose();
    restorePreviewWindow();
  });

  it("gives each locale of the field its own edit target", () => {
    start();

    expect(english.getAttribute(DATA_VE_TARGET_ATTR)).toBe("title");
    expect(german.getAttribute(DATA_VE_TARGET_ATTR)).toBe("title");
    expect(main.hasAttribute(DATA_VE_TARGET_ATTR)).toBe(false);
  });

  it("asks the admin for the locale of the clicked value, not the locale of the page", () => {
    start();

    click(german);

    expect(postToAdmin).toHaveBeenCalledWith(
      {
        collectionSlug: "page",
        docId: "1",
        kind: "collection",
        locale: "de",
        path: "title",
        type: VE_MESSAGE_TYPE,
      },
      ADMIN_ORIGIN
    );
  });

  it("links the edit badge to the locale of the value", () => {
    start();

    expect(buildAdminEditUrl).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "de", path: "title" })
    );
    expect(buildAdminEditUrl).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "en", path: "title" })
    );
  });

  it("keeps instant preview away from values that state their locale", () => {
    start({ instantPreview: true, mode: "off" });

    postFromAdmin({
      collectionSlug: "page",
      docId: "1",
      fields: [{ key: "title", saved: "Home", value: "Home page" }],
      kind: "collection",
      locale: "en",
      type: VE_FIELD_SNAPSHOT_TYPE,
    });

    expect(postToAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ rendered: [], type: VE_FIELDS_RENDERED_TYPE }),
      ADMIN_ORIGIN
    );
    expect(english.textContent).toBe("Home");
  });
});
