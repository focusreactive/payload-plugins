import type { Root } from "react-dom/client";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RichTextEditReceiver } from "../../src/admin/inlineEditing/RichTextEditReceiver";
import {
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_RICH_TEXT_EDIT_ENDED_TYPE,
  VE_RICH_TEXT_EDIT_TYPE,
  VE_RICH_TEXT_STATE_REFUSED_TYPE,
  VE_RICH_TEXT_STATE_REQUEST_TYPE,
  VE_RICH_TEXT_STATE_TYPE,
} from "../../src/shared/protocol";
import { MAX_POSTED_EDITOR_STATE_LENGTH } from "../../src/shared/richText/postedEditorState";

const PREVIEW_ORIGIN = "http://localhost:3333";

const SCRIPT = "javascript";

const BOLD = 1;
const ITALIC = 2;

const text = (value: string, format = 0) => ({
  detail: 0,
  format,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
});

const element = (type: string, children: object[], extra: object = {}) => ({
  children,
  direction: null,
  format: "",
  indent: 0,
  type,
  version: 1,
  ...extra,
});

const paragraphOf = (...children: object[]) => element("paragraph", children);

const stateOf = (...children: object[]) => ({ root: element("root", children) });

const block = (fields: object) => ({ fields, format: "", type: "block", version: 2 });

const inlineBlock = (fields: object) => ({ fields, type: "inlineBlock", version: 1 });

const link = (url: unknown, id = "link-new") =>
  element("link", [text("Docs")], {
    fields: { linkType: "custom", newTab: false, url },
    id,
    version: 3,
  });

const upload = (extra: object = {}) => ({
  fields: null,
  format: "",
  id: "upload-1",
  relationTo: "media",
  type: "upload",
  value: 3,
  version: 3,
  ...extra,
});

const HELD_BLOCK = { blockType: "callout", id: "callout-1", note: "Internal", text: "Held" };

const HELD_LINK = link("ftp://held.example", "link-held");

const heldState = () =>
  stateOf(paragraphOf(text("Body", BOLD)), block(HELD_BLOCK), paragraphOf(HELD_LINK));

const HELD_FORMATS = {
  hasLinks: true,
  hasQuotes: false,
  headings: [],
  lists: [],
  textFormats: BOLD,
};

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

const REQUEST_REFUSED = { ...FIELD, type: VE_RICH_TEXT_STATE_REFUSED_TYPE };

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
          formats: HELD_FORMATS,
          state: stateOf(
            paragraphOf(text("Body", BOLD)),
            block({ blockType: "callout", id: "callout-1" }),
            paragraphOf(HELD_LINK)
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

      expect(admin.postToPreview).toHaveBeenCalledWith({ ...REQUEST_REFUSED, key }, PREVIEW_ORIGIN);
    });

    it("refuses a field that holds no editor state", () => {
      admin.fields.body = { value: null };

      post();

      expect(admin.postToPreview).toHaveBeenCalledWith(REQUEST_REFUSED, PREVIEW_ORIGIN);
    });

    it("refuses a request of another locale", () => {
      post({ data: { ...REQUEST, locale: "de" } });

      expect(admin.postToPreview).toHaveBeenCalledWith(
        { ...REQUEST_REFUSED, locale: "de" },
        PREVIEW_ORIGIN
      );
    });

    it("refuses while the form cannot be changed", () => {
      admin.isFormDisabled = true;
      render();

      post();

      expect(admin.postToPreview).toHaveBeenCalledWith(REQUEST_REFUSED, PREVIEW_ORIGIN);
    });
  });

  describe("sent an edited state", () => {
    const HELD_IDENTITY = block({ blockType: "callout", id: "callout-1" });

    const edited = (first: object = paragraphOf(text("Changed", BOLD)), ...last: object[]) =>
      stateOf(first, HELD_IDENTITY, paragraphOf(HELD_LINK), ...last);

    it("writes it into the form with the fields of its blocks put back, as value and initial value", () => {
      post({ data: editOf(edited()) });

      const value = stateOf(
        paragraphOf(text("Changed", BOLD)),
        block(HELD_BLOCK),
        paragraphOf(HELD_LINK)
      );
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
      const forged = stateOf(
        paragraphOf(text("Body", BOLD)),
        block({ ...HELD_BLOCK, note: "Forged", text: "Forged" }),
        paragraphOf(HELD_LINK)
      );

      post({ data: editOf(forged) });

      expect(admin.dispatchFields).toHaveBeenCalledWith(
        expect.objectContaining({ value: heldState() })
      );
    });

    it.each<[string, unknown]>([
      [
        "a block the form does not hold",
        edited(undefined, block({ blockType: "callout", id: "new" })),
      ],
      ["a block posted twice", edited(undefined, HELD_IDENTITY)],
      [
        "a block in another place among the nodes the page cannot edit",
        stateOf({ type: "horizontalrule", version: 1 }, HELD_IDENTITY, paragraphOf(HELD_LINK)),
      ],
      [
        "an inline block that carries the id of a held block",
        stateOf(
          paragraphOf(inlineBlock({ blockType: "callout", id: "callout-1" })),
          paragraphOf(HELD_LINK)
        ),
      ],
      [
        "a block of another type under the id of a held block",
        stateOf(
          paragraphOf(text("Changed")),
          block({ blockType: "hero", id: "callout-1" }),
          paragraphOf(HELD_LINK)
        ),
      ],
      ["a link to a script", edited(paragraphOf(link(`${SCRIPT}:alert(1)`)))],
      ["a link whose address is a list", edited(paragraphOf(link([`${SCRIPT}:alert(1)`])))],
      ["a link without an address", edited(paragraphOf(link("")))],
      [
        "an address the form holds on another link",
        edited(paragraphOf(link("ftp://held.example", "link-other"))),
      ],
      ["a key the node does not have", edited({ ...paragraphOf(text("Changed")), onclick: "x" })],
      [
        "a style the form does not hold",
        edited(paragraphOf({ ...text("Red"), style: "color: red" })),
      ],
      ["a text format the form does not hold", edited(paragraphOf(text("Slanted", ITALIC)))],
      ["a heading, which the form does not hold", edited(element("heading", [], { tag: "h2" }))],
      ["a quote, which the form does not hold", edited(element("quote", []))],
      [
        "a list, which the form does not hold",
        edited(
          element("list", [element("listitem", [], { value: 1 })], {
            listType: "bullet",
            start: 1,
            tag: "ul",
          })
        ),
      ],
      ["a key of the prototype", edited({ ...paragraphOf(), constructor: {} })],
      ["a state without a root", { children: [] }],
      [
        "a state longer than a posted state may be",
        stateOf(paragraphOf(text("a".repeat(MAX_POSTED_EDITOR_STATE_LENGTH)))),
      ],
    ])("refuses %s", (_name, state) => {
      post({ data: editOf(state) });

      expect(admin.dispatchFields).not.toHaveBeenCalled();
      expect(admin.setModified).not.toHaveBeenCalled();
      expect(admin.postToPreview).toHaveBeenCalledWith(REFUSED, PREVIEW_ORIGIN);
    });

    describe("without a node the page cannot edit", () => {
      const WITHOUT_THE_BLOCK = stateOf(paragraphOf(text("Body", BOLD)), paragraphOf(HELD_LINK));

      const ENDED = { ...FIELD, type: VE_RICH_TEXT_EDIT_ENDED_TYPE };

      const writtenValue = () => admin.dispatchFields.mock.lastCall?.[0].value as object;

      const removeTheBlock = () => {
        post();
        post({ data: editOf(WITHOUT_THE_BLOCK) });
        admin.fields.body = { value: writtenValue() };
        vi.clearAllMocks();
      };

      it("writes the state without it", () => {
        post({ data: editOf(WITHOUT_THE_BLOCK) });

        expect(writtenValue()).toEqual(WITHOUT_THE_BLOCK);
        expect(admin.postToPreview).not.toHaveBeenCalled();
      });

      it("puts it back with its fields when the same edit posts it again", () => {
        removeTheBlock();

        post({ data: editOf(edited(paragraphOf(text("Body", BOLD)))) });

        expect(writtenValue()).toEqual(heldState());
        expect(admin.postToPreview).not.toHaveBeenCalled();
      });

      it("puts it back with the fields the form holds now when it still holds it", () => {
        post();
        const changed = { ...HELD_BLOCK, text: "Changed in the form" };
        admin.fields.body = {
          value: stateOf(paragraphOf(text("Body", BOLD)), block(changed), paragraphOf(HELD_LINK)),
        };

        post({ data: editOf(edited()) });

        expect(writtenValue()).toEqual(
          stateOf(paragraphOf(text("Changed", BOLD)), block(changed), paragraphOf(HELD_LINK))
        );
      });

      it("refuses to put it back once the page said the edit ended", () => {
        removeTheBlock();
        post({ data: ENDED });

        post({ data: editOf(edited(paragraphOf(text("Body", BOLD)))) });

        expect(admin.dispatchFields).not.toHaveBeenCalled();
        expect(admin.postToPreview).toHaveBeenCalledWith(REFUSED, PREVIEW_ORIGIN);
      });

      it("refuses to put it back after the form showed another locale", () => {
        removeTheBlock();
        admin.locale = "de";
        render();
        admin.locale = "en";
        render();

        post({ data: editOf(edited(paragraphOf(text("Body", BOLD)))) });

        expect(admin.dispatchFields).not.toHaveBeenCalled();
        expect(admin.postToPreview).toHaveBeenCalledWith(REFUSED, PREVIEW_ORIGIN);
      });

      it("refuses a block the edit never held, also while the edit runs", () => {
        removeTheBlock();

        post({ data: editOf(edited(undefined, block({ blockType: "callout", id: "new" }))) });

        expect(admin.dispatchFields).not.toHaveBeenCalled();
        expect(admin.postToPreview).toHaveBeenCalledWith(REFUSED, PREVIEW_ORIGIN);
      });
    });

    describe("of a form whose upload node carries a key without a value", () => {
      const typedInTheAdmin = upload({ nested: { pending: undefined }, pending: undefined });

      beforeEach(() => {
        admin.fields.body = { value: stateOf(paragraphOf(text("Body", BOLD)), typedInTheAdmin) };
      });

      it("takes an edit that posts the node as it was serialised, and keeps the node of the form", () => {
        post({ data: editOf(stateOf(paragraphOf(text("Changed", BOLD)), upload({ nested: {} }))) });

        const [written] = admin.dispatchFields.mock.lastCall ?? [];
        const { value } = written as { value: { root: { children: object[] } } };
        expect(value.root.children[1]).toBe(typedInTheAdmin);
        expect(admin.postToPreview).not.toHaveBeenCalled();
      });

      it("still refuses a node that names another file", () => {
        post({ data: editOf(stateOf(paragraphOf(text("Changed", BOLD)), upload({ value: 4 }))) });

        expect(admin.dispatchFields).not.toHaveBeenCalled();
        expect(admin.postToPreview).toHaveBeenCalledWith(REFUSED, PREVIEW_ORIGIN);
      });
    });

    it("takes a link with an address a page may write", () => {
      post({ data: editOf(edited(paragraphOf(link("/docs")))) });

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
