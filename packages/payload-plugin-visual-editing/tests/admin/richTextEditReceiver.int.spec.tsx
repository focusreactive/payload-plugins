import type { Root } from "react-dom/client";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RichTextEditReceiver } from "../../src/admin/inlineEditing/RichTextEditReceiver";
import {
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_RICH_TEXT_EDIT_TYPE,
  VE_RICH_TEXT_STATE_REQUEST_TYPE,
  VE_RICH_TEXT_STATE_TYPE,
} from "../../src/shared/protocol";
import { MAX_POSTED_EDITOR_STATE_LENGTH } from "../../src/shared/richText/postedEditorState";

import { editorState, paragraph, textNode } from "../support/editorState";

const PREVIEW_ORIGIN = "http://localhost:3333";

const SCRIPT = "javascript";

const block = (fields: object) => ({ fields, format: "", type: "block", version: 2 });

const link = (url: string) => ({
  children: [textNode("Docs")],
  fields: { linkType: "custom", newTab: false, url },
  id: "link-1",
  type: "link",
  version: 3,
});

const HELD_BLOCK = { blockType: "callout", id: "callout-1", note: "Internal", text: "Held" };

const heldState = () => editorState(paragraph(textNode("Body")), block(HELD_BLOCK));

const admin = vi.hoisted(() => {
  const postMessage = vi.fn();
  const frame = { contentWindow: { postMessage } };
  return {
    dispatchFields: vi.fn(),
    fields: {} as Record<string, { value: unknown }>,
    frame,
    iframeRef: { current: frame },
    isFormDisabled: false,
    locale: "en",
    postToPreview: postMessage,
    setModified: vi.fn(),
  };
});

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({
    config: { blocksMap: {} },
    getEntityConfig: () => ({
      fields: [
        { name: "title", type: "text" },
        { name: "body", type: "richText" },
        { name: "internal", type: "richText" },
      ],
    }),
  }),
  useDocumentInfo: () => ({ collectionSlug: "page", id: 7 }),
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
  useLocale: () => ({ code: admin.locale }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const FIELD = {
  collectionSlug: "page",
  docId: "7",
  key: "body",
  kind: "collection",
  locale: "en",
};

const REQUEST = { ...FIELD, type: VE_RICH_TEXT_STATE_REQUEST_TYPE };

const REFUSED = { ...FIELD, type: VE_FIELD_EDIT_REFUSED_TYPE };

const editOf = (state: unknown) => ({ ...FIELD, state, type: VE_RICH_TEXT_EDIT_TYPE });

const post = ({
  data = REQUEST as object,
  origin = PREVIEW_ORIGIN,
  source = admin.frame.contentWindow as object,
} = {}) =>
  act(() => {
    const message = new MessageEvent("message", { data, origin });
    Object.defineProperty(message, "source", { value: source });
    window.dispatchEvent(message);
  });

describe("RichTextEditReceiver", () => {
  let root: Root;
  let container: HTMLElement;

  const render = () =>
    act(() => root.render(<RichTextEditReceiver excludeFieldNames={["internal"]} />));

  beforeEach(() => {
    admin.fields = {
      body: { value: heldState() },
      internal: { value: heldState() },
      title: { value: "Title" },
    };
    admin.isFormDisabled = false;
    admin.locale = "en";
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    render();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  describe("asked for the state of a rich text field", () => {
    it("answers the state the form holds, without the fields of its blocks", () => {
      post();

      expect(admin.postToPreview).toHaveBeenCalledWith(
        {
          ...FIELD,
          state: editorState(
            paragraph(textNode("Body")),
            block({ blockType: "callout", id: "callout-1" })
          ),
          type: VE_RICH_TEXT_STATE_TYPE,
        },
        PREVIEW_ORIGIN
      );
    });

    it("ignores a request from another origin", () => {
      post({ origin: "https://elsewhere.example" });

      expect(admin.postToPreview).not.toHaveBeenCalled();
    });

    it("ignores a request from a window that is not the preview", () => {
      post({ source: {} });

      expect(admin.postToPreview).not.toHaveBeenCalled();
    });

    it("says nothing about another document, which another form may answer", () => {
      post({ data: { ...REQUEST, docId: "8" } });

      expect(admin.postToPreview).not.toHaveBeenCalled();
    });

    it.each([
      ["a field that is not rich text", "title"],
      ["a field the form does not hold", "missing"],
      ["an excluded field", "internal"],
    ])("refuses %s", (_name, key) => {
      post({ data: { ...REQUEST, key } });

      expect(admin.postToPreview).toHaveBeenCalledWith({ ...REFUSED, key }, PREVIEW_ORIGIN);
    });

    it("refuses a field that holds no editor state", () => {
      admin.fields.body = { value: null };

      post();

      expect(admin.postToPreview).toHaveBeenCalledWith(REFUSED, PREVIEW_ORIGIN);
    });

    it("refuses a request of another locale", () => {
      post({ data: { ...REQUEST, locale: "de" } });

      expect(admin.postToPreview).toHaveBeenCalledWith(
        { ...REFUSED, locale: "de" },
        PREVIEW_ORIGIN
      );
    });

    it("refuses while the form cannot be changed", () => {
      admin.isFormDisabled = true;
      render();

      post();

      expect(admin.postToPreview).toHaveBeenCalledWith(REFUSED, PREVIEW_ORIGIN);
    });
  });

  describe("sent an edited state", () => {
    const edited = (...extra: object[]) =>
      editorState(
        paragraph(textNode("Changed", 1)),
        block({ blockType: "callout", id: "callout-1" }),
        ...extra
      );

    it("writes it into the form with the fields of its blocks put back, as value and initial value", () => {
      post({ data: editOf(edited()) });

      const value = editorState(paragraph(textNode("Changed", 1)), block(HELD_BLOCK));
      expect(admin.dispatchFields).toHaveBeenCalledWith({
        initialValue: value,
        path: "body",
        type: "UPDATE",
        value,
      });
      expect(admin.setModified).toHaveBeenCalledWith(true);
      expect(admin.postToPreview).not.toHaveBeenCalled();
    });

    it("keeps the fields the form holds when the page sends others", () => {
      const forged = editorState(block({ ...HELD_BLOCK, note: "Forged", text: "Forged" }));

      post({ data: editOf(forged) });

      expect(admin.dispatchFields).toHaveBeenCalledWith(
        expect.objectContaining({ value: editorState(block(HELD_BLOCK)) })
      );
    });

    it.each([
      ["a block the form does not hold", edited(block({ blockType: "callout", id: "new" }))],
      ["a block without an id", edited(block({ blockType: "callout" }))],
      ["a link to a script", edited(paragraph(link(`${SCRIPT}:alert(1)`)))],
      ["a state without a root", { children: [] }],
      [
        "a state longer than a posted state may be",
        editorState(paragraph(textNode("a".repeat(MAX_POSTED_EDITOR_STATE_LENGTH)))),
      ],
    ])("refuses %s", (_name, state) => {
      post({ data: editOf(state) });

      expect(admin.dispatchFields).not.toHaveBeenCalled();
      expect(admin.setModified).not.toHaveBeenCalled();
      expect(admin.postToPreview).toHaveBeenCalledWith(REFUSED, PREVIEW_ORIGIN);
    });

    it("takes a link with an address a page may write", () => {
      post({ data: editOf(edited(paragraph(link("/docs")))) });

      expect(admin.dispatchFields).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["a field that is not rich text", { key: "title" }],
      ["an excluded field", { key: "internal" }],
      ["another locale", { locale: "de" }],
    ])("refuses an edit of %s", (_name, field) => {
      post({ data: { ...editOf(edited()), ...field } });

      expect(admin.dispatchFields).not.toHaveBeenCalled();
      expect(admin.postToPreview).toHaveBeenCalledWith({ ...REFUSED, ...field }, PREVIEW_ORIGIN);
    });

    it("refuses while the form cannot be changed", () => {
      admin.isFormDisabled = true;
      render();

      post({ data: editOf(edited()) });

      expect(admin.dispatchFields).not.toHaveBeenCalled();
      expect(admin.postToPreview).toHaveBeenCalledWith(REFUSED, PREVIEW_ORIGIN);
    });

    it("ignores an edit from another origin or another window", () => {
      post({ data: editOf(edited()), origin: "https://elsewhere.example" });
      post({ data: editOf(edited()), source: {} });

      expect(admin.dispatchFields).not.toHaveBeenCalled();
      expect(admin.postToPreview).not.toHaveBeenCalled();
    });

    it("says nothing about an edit of another document", () => {
      post({ data: { ...editOf(edited()), docId: "8" } });

      expect(admin.dispatchFields).not.toHaveBeenCalled();
      expect(admin.postToPreview).not.toHaveBeenCalled();
    });
  });

  it("stops listening when it unmounts", () => {
    act(() => root.render(null));

    post();

    expect(admin.postToPreview).not.toHaveBeenCalled();
  });
});
