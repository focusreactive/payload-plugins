import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Overlay } from "../../src/client/createOverlay";
import type { VeRenderedMessage } from "../../src/shared/protocol";

import { createOverlay } from "../../src/client/createOverlay";
import { VE_FIELD_SNAPSHOT_TYPE, VE_FIELDS_RENDERED_TYPE } from "../../src/shared/protocol";

import { markedText } from "../support/markedData";
import { overlayCtx } from "../support/overlay";
import { postFromAdmin, restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";

const ctx = overlayCtx({ instantPreview: true, mode: "off" });

const page = { collectionSlug: "page", docId: "1", kind: "collection" } as const;

const marked = (path: string, text: string) => markedText(text, { ...page, path });

const loadAnotherOverlayBundle = async () => {
  vi.resetModules();
  return await import("../../src/client/createOverlay");
};

describe("two overlays on one page", () => {
  let header: HTMLElement;
  let body: HTMLElement;
  let overlays: Overlay[];
  let postToAdmin: ReturnType<typeof vi.fn>;

  const announcements = (): VeRenderedMessage<typeof VE_FIELDS_RENDERED_TYPE>[] =>
    postToAdmin.mock.calls
      .map(([message]) => message)
      .filter(({ type }) => type === VE_FIELDS_RENDERED_TYPE);

  beforeEach(() => {
    document.body.innerHTML = "";
    header = document.createElement("header");
    header.textContent = marked("siteName", "Acme");
    body = document.createElement("main");
    body.textContent = marked("title", "Hell");
    document.body.append(header, body);
    postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });
    overlays = [createOverlay(header, () => ctx), createOverlay(body, () => ctx)];
  });

  afterEach(() => {
    for (const overlay of overlays) overlay.dispose();
    restorePreviewWindow();
  });

  it("announce their own fields on the same page load", () => {
    const [ofHeader, ofBody] = announcements();

    expect(ofHeader?.rendered).toEqual([{ ...page, keys: ["siteName"] }]);
    expect(ofBody?.rendered).toEqual([{ ...page, keys: ["title"] }]);
    expect(ofHeader?.pageId).toBe(ofBody?.pageId);
    expect(ofHeader?.pageId).toEqual(expect.any(String));
  });

  it("both show the form values of a snapshot that covers the fields of both", () => {
    postFromAdmin({
      ...page,
      fields: [
        { key: "siteName", saved: "Acme", value: "Acme Inc" },
        { key: "title", saved: "Hell", value: "Hello" },
      ],
      type: VE_FIELD_SNAPSHOT_TYPE,
    });

    expect(header.textContent).toBe("Acme Inc");
    expect(body.textContent).toBe("Hello");
  });

  it("announce the same page load when each comes from its own bundle", async () => {
    const footer = document.createElement("footer");
    footer.textContent = marked("legal", "Terms");
    document.body.append(footer);
    const anotherBundle = await loadAnotherOverlayBundle();

    overlays.push(anotherBundle.createOverlay(footer, () => ctx));
    const [ofHeader, , ofFooter] = announcements();

    expect(ofFooter?.rendered).toEqual([{ ...page, keys: ["legal"] }]);
    expect(ofFooter?.pageId).toBe(ofHeader?.pageId);
  });

  it("keep the other one live when one of them stops", () => {
    postToAdmin.mockClear();

    overlays[0]?.dispose();
    postFromAdmin({
      ...page,
      fields: [{ key: "title", saved: "Hell", value: "Hello" }],
      type: VE_FIELD_SNAPSHOT_TYPE,
    });

    expect(postToAdmin).not.toHaveBeenCalled();
    expect(body.textContent).toBe("Hello");
  });
});
