import type { Root } from "react-dom/client";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InlineEditReceiver } from "../../src/admin/inlineEditing/InlineEditReceiver";
import { VE_FIELD_EDIT_REFUSED_TYPE, VE_FIELD_EDIT_TYPE } from "../../src/shared/protocol";

const PREVIEW_ORIGIN = "http://localhost:3333";

const EVERY_FIELD = vi.hoisted(() => ({ fields: true, read: true, update: true }));

const TITLE_READ_ONLY = { fields: { title: { read: true } }, read: true, update: true };

const admin = vi.hoisted(() => {
  const postMessage = vi.fn();
  const frame = { contentWindow: { postMessage } };
  return {
    permissions: EVERY_FIELD as object,
    postToPreview: postMessage,
    dispatchFields: vi.fn(),
    isFormDisabled: false,
    fields: { title: { value: "Title" } } as Record<string, { value: unknown }>,
    frame,
    iframeRef: { current: frame },
    setModified: vi.fn(),
  };
});

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({
    config: { blocksMap: {} },
    getEntityConfig: () => ({ fields: [{ name: "title", type: "text" }] }),
  }),
  useDocumentInfo: () => ({ collectionSlug: "page", docPermissions: admin.permissions, id: 7 }),
  useForm: () => ({
    disabled: admin.isFormDisabled,
    dispatchFields: admin.dispatchFields,
    getFields: () => admin.fields,
    setModified: admin.setModified,
  }),
  useLivePreviewContext: () => ({
    iframeRef: admin.iframeRef,
    isLivePreviewing: true,
    popupRef: { current: null },
    previewWindowType: "iframe",
    url: `${PREVIEW_ORIGIN}/en/home`,
  }),
  useLocale: () => ({ code: "en" }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const EDIT = {
  collectionSlug: "page",
  docId: "7",
  key: "title",
  kind: "collection",
  locale: "en",
  type: VE_FIELD_EDIT_TYPE,
  value: "New title",
};

const postEdit = ({
  data = EDIT as object,
  origin = PREVIEW_ORIGIN,
  source = admin.frame.contentWindow as object,
} = {}) =>
  act(() => {
    const message = new MessageEvent("message", { data, origin });
    Object.defineProperty(message, "source", { value: source });
    window.dispatchEvent(message);
  });

describe("InlineEditReceiver", () => {
  let root: Root;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<InlineEditReceiver />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    admin.permissions = EVERY_FIELD;
    vi.clearAllMocks();
  });

  it("writes an edit of the preview page into the form and marks the form as changed", () => {
    postEdit();

    expect(admin.dispatchFields).toHaveBeenCalledWith({
      path: "title",
      type: "UPDATE",
      value: "New title",
    });
    expect(admin.setModified).toHaveBeenCalledWith(true);
  });

  it("ignores an edit from another origin", () => {
    postEdit({ origin: "https://elsewhere.example" });

    expect(admin.dispatchFields).not.toHaveBeenCalled();
  });

  it("ignores an edit from a window that is not the preview", () => {
    postEdit({ source: {} });

    expect(admin.dispatchFields).not.toHaveBeenCalled();
  });

  it("tells the preview page when it cannot write an edit of its document", () => {
    postEdit({ data: { ...EDIT, key: "missing" } });

    expect(admin.dispatchFields).not.toHaveBeenCalled();
    expect(admin.setModified).not.toHaveBeenCalled();
    expect(admin.postToPreview).toHaveBeenCalledWith(
      {
        collectionSlug: "page",
        docId: "7",
        key: "missing",
        kind: "collection",
        locale: "en",
        reason: "not-editable",
        type: VE_FIELD_EDIT_REFUSED_TYPE,
      },
      PREVIEW_ORIGIN
    );
  });

  it("refuses an edit of a field the user may read and not update", () => {
    admin.permissions = TITLE_READ_ONLY;
    act(() => root.render(<InlineEditReceiver />));

    postEdit();

    expect(admin.dispatchFields).not.toHaveBeenCalled();
    expect(admin.setModified).not.toHaveBeenCalled();
    expect(admin.postToPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "title",
        reason: "not-editable",
        type: VE_FIELD_EDIT_REFUSED_TYPE,
      }),
      PREVIEW_ORIGIN
    );
  });

  it("refuses an edit while the form cannot be changed", () => {
    admin.isFormDisabled = true;
    act(() => root.render(<InlineEditReceiver />));

    postEdit();
    admin.isFormDisabled = false;

    expect(admin.dispatchFields).not.toHaveBeenCalled();
    expect(admin.postToPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "title",
        reason: "not-editable",
        type: VE_FIELD_EDIT_REFUSED_TYPE,
      }),
      PREVIEW_ORIGIN
    );
  });

  it("says nothing about an edit of another document, which another form may take", () => {
    postEdit({ data: { ...EDIT, docId: "8" } });

    expect(admin.dispatchFields).not.toHaveBeenCalled();
    expect(admin.postToPreview).not.toHaveBeenCalled();
  });

  it("stops listening when it unmounts", () => {
    act(() => root.render(null));

    postEdit();

    expect(admin.dispatchFields).not.toHaveBeenCalled();
  });
});
