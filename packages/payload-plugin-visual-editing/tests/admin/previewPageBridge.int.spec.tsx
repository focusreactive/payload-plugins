import type { Root } from "react-dom/client";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PreviewPageBridge } from "../../src/admin/PreviewPageBridge";
import { VE_DOCUMENT_SAVED_TYPE } from "../../src/shared/protocol";

const PREVIEW_ORIGIN = "http://localhost:3333";

type DocumentEvent = { entitySlug: string; id?: number | string; updatedAt: string };

const admin = vi.hoisted(() => {
  const postMessage = vi.fn();
  return {
    iframeRef: { current: { contentWindow: { postMessage } } },
    locale: "en" as string | undefined,
    mostRecentUpdate: null as DocumentEvent | null,
    postMessage,
  };
});

vi.mock("@payloadcms/ui", () => ({
  useDocumentEvents: () => ({ mostRecentUpdate: admin.mostRecentUpdate }),
  useLivePreviewContext: () => ({
    iframeRef: admin.iframeRef,
    isLivePreviewing: true,
    popupRef: { current: null },
    previewWindowType: "iframe",
    url: `${PREVIEW_ORIGIN}/en/home`,
  }),
  useLocale: () => ({ code: admin.locale }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root;

const render = () => act(() => root.render(<PreviewPageBridge />));

const save = (event: Omit<DocumentEvent, "updatedAt">) => {
  admin.mostRecentUpdate = { ...event, updatedAt: new Date().toISOString() };
  render();
};

beforeEach(() => {
  admin.postMessage.mockReset();
  admin.mostRecentUpdate = null;
  admin.locale = "en";
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  render();
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
});

describe("the save the admin reports to the preview page", () => {
  it("names the collection document that was saved and the locale of the admin", () => {
    save({ entitySlug: "pages", id: 7 });

    expect(admin.postMessage.mock.calls).toEqual([
      [
        {
          collectionSlug: "pages",
          docId: "7",
          kind: "collection",
          locale: "en",
          type: VE_DOCUMENT_SAVED_TYPE,
        },
        PREVIEW_ORIGIN,
      ],
    ]);
  });

  it("names a global, which is saved without an id", () => {
    save({ entitySlug: "header" });

    expect(admin.postMessage.mock.calls[0]?.[0]).toEqual({
      collectionSlug: "header",
      kind: "global",
      locale: "en",
      type: VE_DOCUMENT_SAVED_TYPE,
    });
  });

  it("names the document saved in a drawer, not the one the form is open on", () => {
    save({ entitySlug: "media", id: "9" });

    expect(admin.postMessage.mock.calls[0]?.[0]).toMatchObject({
      collectionSlug: "media",
      docId: "9",
    });
  });

  it("names no locale in a project without localization", () => {
    admin.locale = undefined;
    render();

    save({ entitySlug: "pages", id: 7 });

    expect(admin.postMessage.mock.calls[0]?.[0]).toEqual({
      collectionSlug: "pages",
      docId: "7",
      kind: "collection",
      type: VE_DOCUMENT_SAVED_TYPE,
    });
  });

  it("reports a save once, however often the admin renders", () => {
    save({ entitySlug: "pages", id: 7 });
    render();

    expect(admin.postMessage).toHaveBeenCalledTimes(1);
  });
});
