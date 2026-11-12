import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InstantPreviewBroadcaster } from "../../src/admin/InstantPreviewBroadcaster";
import {
  VE_ANNOUNCE_REQUEST_TYPE,
  VE_FIELD_PATCH_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_FIELDS_RENDERED_TYPE,
} from "../../src/shared/protocol";

const PREVIEW_ORIGIN = "http://localhost:3333";
const PREVIEW_URL = `${PREVIEW_ORIGIN}/en/home`;
const BLANK_PAGE_URL = "about:blank";

type DocumentInfo = { id?: number; collectionSlug?: string; globalSlug?: string; data?: object };
type FormFields = Record<string, { value: unknown }>;
type EntityLookup = { collectionSlug?: string; globalSlug?: string };
type PreviewPopup = {
  location?: { href: string };
  postMessage: (message: unknown, targetOrigin: string) => void;
};

const ENTITIES: Record<string, { auth?: object; fields: unknown[] }> = {
  nav: { fields: [{ name: "title", type: "text" }] },
  page: { fields: [{ name: "title", type: "text" }] },
  users: { auth: {}, fields: [{ name: "title", type: "text" }] },
};

const admin = vi.hoisted(() => {
  const postMessage = vi.fn();
  const frame = Object.assign(new EventTarget(), {
    contentWindow: { location: { href: "about:blank" }, postMessage },
  });
  return {
    documentInfo: {} as DocumentInfo,
    fields: {} as FormFields,
    frame,
    iframeRef: { current: frame },
    isLivePreviewing: true,
    locale: "en",
    popupRef: { current: null as PreviewPopup | null },
    postMessage,
    previewWindowType: "iframe" as "iframe" | "popup",
  };
});

vi.mock("@payloadcms/ui", () => ({
  useAllFormFields: () => [admin.fields, vi.fn()],
  useConfig: () => ({
    config: { blocksMap: {} },
    getEntityConfig: ({ collectionSlug, globalSlug }: EntityLookup) =>
      ENTITIES[collectionSlug ?? globalSlug ?? ""] ?? null,
  }),
  useDocumentInfo: () => admin.documentInfo,
  useLivePreviewContext: () => ({
    iframeRef: admin.iframeRef,
    isLivePreviewing: admin.isLivePreviewing,
    popupRef: admin.popupRef,
    previewWindowType: admin.previewWindowType,
    url: PREVIEW_URL,
  }),
  useLocale: () => ({ code: admin.locale }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const PAGE = { collectionSlug: "page", docId: "7", kind: "collection", locale: "en" };
const ANNOUNCE_REQUEST = [{ type: VE_ANNOUNCE_REQUEST_TYPE }, PREVIEW_ORIGIN];
const TITLE_SNAPSHOT = { key: "title", saved: "Hell", value: "Hell" };

let root: Root;

const render = () => act(() => root.render(<InstantPreviewBroadcaster />));

const edit = (title: string) => {
  admin.fields = { ...admin.fields, title: { value: title } };
  render();
};

const announcePreview = ({
  origin = PREVIEW_ORIGIN,
  pageId = "page-load-1",
  source = admin.frame.contentWindow as object,
  document = { collectionSlug: "page", docId: "7", kind: "collection" } as object,
} = {}) =>
  act(() => {
    const announcement = new MessageEvent("message", {
      data: { pageId, rendered: [{ ...document, keys: ["title"] }], type: VE_FIELDS_RENDERED_TYPE },
      origin,
    });
    Object.defineProperty(announcement, "source", { value: source });
    window.dispatchEvent(announcement);
  });

const loadPageInPreviewFrame = () =>
  act(() => {
    admin.frame.contentWindow.location.href = PREVIEW_URL;
    admin.frame.dispatchEvent(new Event("load"));
  });

const openPopup = (popup: PreviewPopup) => {
  admin.previewWindowType = "popup";
  admin.popupRef.current = popup;
  render();
};

const renderWatchingFormWalks = () => {
  const walkForm = vi.fn();
  admin.fields = new Proxy(
    { title: { value: "Hello" } },
    {
      ownKeys(form) {
        walkForm();
        return Reflect.ownKeys(form);
      },
    }
  );
  render();
  return walkForm;
};

const postedTypes = (postMessage = admin.postMessage) =>
  postMessage.mock.calls.map(([message]) => message.type);

describe("InstantPreviewBroadcaster", () => {
  beforeEach(() => {
    admin.postMessage.mockClear();
    admin.previewWindowType = "iframe";
    admin.isLivePreviewing = true;
    admin.locale = "en";
    admin.frame.contentWindow.location.href = BLANK_PAGE_URL;
    admin.popupRef.current = null;
    admin.documentInfo = { collectionSlug: "page", data: { title: "Hell" }, id: 7 };
    admin.fields = { title: { value: "Hell" } };
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    render();
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it("answers the preview frame at the preview origin and patches it as the form changes", () => {
    edit("Hell");

    expect(admin.postMessage).not.toHaveBeenCalled();

    announcePreview();

    expect(renderWatchingFormWalks()).toHaveBeenCalledTimes(1);
    expect(admin.postMessage.mock.calls).toEqual([
      [{ type: VE_FIELD_SNAPSHOT_TYPE, ...PAGE, fields: [TITLE_SNAPSHOT] }, PREVIEW_ORIGIN],
      [
        { type: VE_FIELD_PATCH_TYPE, ...PAGE, patches: [{ key: "title", value: "Hello" }] },
        PREVIEW_ORIGIN,
      ],
    ]);
  });

  it.each([
    ["another origin", { origin: "https://evil.example.com" }],
    ["a window that is not the preview", { source: { postMessage: vi.fn() } }],
  ])("ignores an announcement from %s", (_label, announcement) => {
    announcePreview(announcement);
    edit("Hello");

    expect(admin.postMessage).not.toHaveBeenCalled();
  });

  it.each([
    ["asks a frame that holds a page", PREVIEW_URL, [ANNOUNCE_REQUEST]],
    ["does not ask a frame that has not loaded a page yet", BLANK_PAGE_URL, []],
  ])("%s to announce itself when it mounts", (_label, href, requests) => {
    act(() => root.render(null));
    admin.frame.contentWindow.location.href = href;

    render();

    expect(admin.postMessage.mock.calls).toEqual(requests);
  });

  it("asks the page to announce itself when the frame loads it, and sends nothing until it does", () => {
    announcePreview();
    admin.postMessage.mockClear();

    loadPageInPreviewFrame();
    edit("Hello");

    expect(admin.postMessage.mock.calls).toEqual([ANNOUNCE_REQUEST]);
  });

  it.each([
    ["has loaded a page of its own origin", { href: PREVIEW_URL }, [VE_ANNOUNCE_REQUEST_TYPE]],
    ["is still on the blank page it opened with", { href: BLANK_PAGE_URL }, []],
    [
      "keeps its location to itself",
      {
        get href(): string {
          throw new DOMException("Blocked a frame from accessing a cross-origin frame");
        },
      },
      [VE_ANNOUNCE_REQUEST_TYPE],
    ],
  ])("talks to a popup that %s", (_label, location, requests) => {
    const postToPopup = vi.fn();
    openPopup({ location, postMessage: postToPopup });

    expect(postedTypes(postToPopup)).toEqual(requests);

    postToPopup.mockClear();
    announcePreview({ source: admin.popupRef.current as object });

    expect(postedTypes(postToPopup)).toEqual([VE_FIELD_SNAPSHOT_TYPE]);
    expect(admin.postMessage).not.toHaveBeenCalled();
  });

  it.each([
    ["the live preview is closed", () => Object.assign(admin, { isLivePreviewing: false })],
    ["the preview is a closed popup", () => Object.assign(admin, { previewWindowType: "popup" })],
  ])(
    "walks no form and sends nothing while %s, and starts over when the frame is back",
    (_label, closePreview) => {
      admin.frame.contentWindow.location.href = PREVIEW_URL;
      announcePreview();
      admin.postMessage.mockClear();
      closePreview();

      expect(renderWatchingFormWalks()).not.toHaveBeenCalled();
      expect(admin.postMessage).not.toHaveBeenCalled();

      Object.assign(admin, { isLivePreviewing: true, previewWindowType: "iframe" });
      render();
      edit("Hello!");

      expect(admin.postMessage.mock.calls).toEqual([ANNOUNCE_REQUEST]);

      admin.postMessage.mockClear();
      announcePreview();

      expect(admin.postMessage.mock.calls).toEqual([
        [
          {
            type: VE_FIELD_SNAPSHOT_TYPE,
            ...PAGE,
            fields: [{ key: "title", saved: "Hell", value: "Hello!" }],
          },
          PREVIEW_ORIGIN,
        ],
      ]);
    }
  );

  it("neither asks nor answers the page of a locale the form has left", () => {
    loadPageInPreviewFrame();
    announcePreview();
    admin.postMessage.mockClear();

    admin.locale = "de";
    render();
    announcePreview();
    edit("Hallo");

    expect(admin.postMessage).not.toHaveBeenCalled();
  });

  it("sends nothing from a collection with auth", () => {
    admin.documentInfo = { collectionSlug: "users", data: { title: "Ada" }, id: 7 };
    render();
    announcePreview({ document: { collectionSlug: "users", docId: "7", kind: "collection" } });
    edit("Ada L.");

    expect(admin.postMessage).not.toHaveBeenCalled();
  });

  it("describes a global document without a document id", () => {
    admin.documentInfo = { data: { title: "Hell" }, globalSlug: "nav" };
    render();

    announcePreview({ document: { collectionSlug: "nav", kind: "global" } });

    expect(admin.postMessage).toHaveBeenCalledWith(
      {
        type: VE_FIELD_SNAPSHOT_TYPE,
        collectionSlug: "nav",
        fields: [TITLE_SNAPSHOT],
        kind: "global",
        locale: "en",
      },
      PREVIEW_ORIGIN
    );
  });

  it("stops listening to the frame and the preview when it is unmounted", () => {
    act(() => root.render(null));

    loadPageInPreviewFrame();
    announcePreview();

    expect(admin.postMessage).not.toHaveBeenCalled();
  });
});
