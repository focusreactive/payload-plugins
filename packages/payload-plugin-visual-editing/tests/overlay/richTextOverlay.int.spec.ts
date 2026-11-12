import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Overlay, OverlayCtx } from "../../src/client/createOverlay";
import type { VeFieldPatchMessage, VeFieldSnapshotMessage } from "../../src/shared/protocol";

import { DATA_VE_TARGET_ATTR, STEGA_PREFILTER } from "../../src/client/overlay/constants";
import { createOverlay } from "../../src/client/createOverlay";
import {
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_DOC_ID_ATTR,
  DATA_VE_KEY_ATTR,
  DATA_VE_KIND_ATTR,
  DATA_VE_LIVE_ATTR,
  DATA_VE_LOCALE_ATTR,
  DATA_VE_PATH_ATTR,
  VE_FIELD_PATCH_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_FIELDS_RENDERED_TYPE,
  VE_LIVE_OFF,
} from "../../src/shared/protocol";
import { richTextNodeKeyOf } from "../../src/shared/richText/nodeKey";

import { markedText, markedTextNode } from "../support/markedData";
import { overlayCtx } from "../support/overlay";
import {
  ADMIN_ORIGIN,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
} from "../support/previewWindow";
import { flushMutations } from "../support/time";

const SHAPE = "abc123";

const ctx = overlayCtx({ instantPreview: true, locale: "en", mode: "hover" });

const page = { collectionSlug: "page", docId: "1", kind: "collection", locale: "en" } as const;

const renderedDocument = { collectionSlug: "page", docId: "1", kind: "collection" } as const;

const PAGE_ATTRIBUTES = {
  [DATA_VE_COLLECTION_ATTR]: "page",
  [DATA_VE_DOC_ID_ATTR]: "1",
  [DATA_VE_KIND_ATTR]: "collection",
};

const CONTENT_ATTRIBUTES = { ...PAGE_ATTRIBUTES, [DATA_VE_PATH_ATTR]: "content" };

type Leaf = [visible: string, node: string];

const nodeMarker = (visible: string, node: string, shape = SHAPE) =>
  markedTextNode(visible, node, shape);

const renderParagraph = (leaves: Leaf[]) => {
  const paragraph = document.createElement("p");
  for (const [visible, node] of leaves) {
    const span = document.createElement("span");
    span.textContent = nodeMarker(visible, node);
    paragraph.append(span);
  }
  return paragraph;
};

const renderRichText = (attributes: Record<string, string>, leaves: Leaf[]) => {
  const wrapper = document.createElement("div");
  for (const [name, value] of Object.entries(attributes)) wrapper.setAttribute(name, value);
  wrapper.append(renderParagraph(leaves));
  return wrapper;
};

const spansOf = (root: Element) => Array.from(root.querySelectorAll("span"));

const textsOf = (root: Element) => spansOf(root).map((span) => span.textContent);

const textNodeOf = (span: Element | undefined) => span?.firstChild as Text;

const nodeKey = (address: string, fieldKey = "content", shape = SHAPE) =>
  richTextNodeKeyOf({ address, fieldKey, shape });

const snapshot = (
  ...fields: [key: string, saved: string, value?: string][]
): VeFieldSnapshotMessage => ({
  type: VE_FIELD_SNAPSHOT_TYPE,
  ...page,
  fields: fields.map(([key, saved, value = saved]) => ({ key, saved, value })),
});

const patch = (key: string, value: string): VeFieldPatchMessage => ({
  type: VE_FIELD_PATCH_TYPE,
  ...page,
  patches: [{ key, value }],
});

const announcementOf = (...keys: string[]) => ({
  locale: "en",
  pageId: expect.any(String),
  rendered: keys.length > 0 ? [{ ...renderedDocument, keys }] : [],
  type: VE_FIELDS_RENDERED_TYPE,
});

describe("the text nodes of rich text in the overlay", () => {
  let main: HTMLElement;
  let overlay: Overlay | undefined;
  let postToAdmin: ReturnType<typeof vi.fn>;

  const start = (overrides: Partial<OverlayCtx> = {}) => {
    overlay = createOverlay(main, () => ({ ...ctx, ...overrides }));
  };

  const show = (...elements: Element[]) => main.append(...elements);

  beforeEach(() => {
    overlay = undefined;
    document.body.innerHTML = "";
    main = document.createElement("main");
    document.body.append(main);
    postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });
  });

  afterEach(() => {
    overlay?.dispose();
    restorePreviewWindow();
  });

  it("announces each text node of a rich text field under the key of its wrapper", () => {
    const content = renderRichText(CONTENT_ATTRIBUTES, [
      ["Hello ", "0.0"],
      ["world", "0.1"],
    ]);
    show(content);

    start();

    expect(postToAdmin.mock.calls).toEqual([
      [announcementOf(nodeKey("0.0"), nodeKey("0.1")), ADMIN_ORIGIN],
    ]);
    expect(textsOf(content)).toEqual(["Hello ", "world"]);
    expect(STEGA_PREFILTER.test(content.textContent ?? "")).toBe(false);
  });

  it("uses the stable key of the wrapper when it has one", () => {
    show(
      renderRichText(
        {
          ...PAGE_ATTRIBUTES,
          [DATA_VE_KEY_ATTR]: "layout.6a1f.body",
          [DATA_VE_PATH_ATTR]: "layout.0.body",
        },
        [["Hello", "0.0"]]
      )
    );

    start();

    expect(postToAdmin.mock.calls).toEqual([
      [announcementOf(nodeKey("0.0", "layout.6a1f.body")), ADMIN_ORIGIN],
    ]);
  });

  it("rewrites one text node when the admin patches it", () => {
    const content = renderRichText(CONTENT_ATTRIBUTES, [
      ["Hello ", "0.0"],
      ["world", "0.1"],
    ]);
    show(content);
    start();

    postFromAdmin(snapshot([nodeKey("0.0"), "Hello "], [nodeKey("0.1"), "world"]));
    postFromAdmin(patch(nodeKey("0.0"), "Hello, "));

    expect(textsOf(content)).toEqual(["Hello, ", "world"]);
  });

  it("leaves a text node whose render changed the text", () => {
    const content = renderRichText(CONTENT_ATTRIBUTES, [["HELLO", "0.0"]]);
    show(content);
    start();

    postFromAdmin(snapshot([nodeKey("0.0"), "Hello"]));
    postFromAdmin(patch(nodeKey("0.0"), "Hello!"));

    expect(textsOf(content)).toEqual(["HELLO"]);
  });

  it("keeps a text node that holds nothing but white space and patches it", () => {
    const content = renderRichText(CONTENT_ATTRIBUTES, [
      ["Hello", "0.0"],
      [" ", "0.1"],
      ["\t", "0.2"],
    ]);
    show(content);
    start();

    expect(textsOf(content)).toEqual(["Hello", " ", "\t"]);
    expect(postToAdmin.mock.calls).toEqual([
      [announcementOf(nodeKey("0.0"), nodeKey("0.1"), nodeKey("0.2")), ADMIN_ORIGIN],
    ]);

    postFromAdmin(snapshot([nodeKey("0.1"), " "], [nodeKey("0.2"), "\t"]));
    postFromAdmin(patch(nodeKey("0.1"), " and "));

    expect(textsOf(content)).toEqual(["Hello", " and ", "\t"]);
  });

  it("paints only the text node of the field when a nested rich text shows the same text", () => {
    const captionShape = "cap789";
    const content = renderRichText(CONTENT_ATTRIBUTES, [["Read more", "0.0"]]);
    const caption = document.createElement("figcaption");
    caption.textContent = nodeMarker("Read more", "0.0", captionShape);
    content.append(caption);
    show(content);
    start();

    postFromAdmin(snapshot([nodeKey("0.0"), "Read more"]));
    postFromAdmin(patch(nodeKey("0.0"), "Read more now"));

    expect(postToAdmin.mock.calls).toEqual([
      [announcementOf(nodeKey("0.0"), nodeKey("0.0", "content", captionShape)), ADMIN_ORIGIN],
    ]);
    expect(textsOf(content)).toEqual(["Read more now"]);
    expect(caption.textContent).toBe("Read more");
  });

  it("decides for each text node on its own whether it still shows a known value", () => {
    const raw = renderRichText(CONTENT_ATTRIBUTES, [["Hello", "0.0"]]);
    const transformed = renderRichText(CONTENT_ATTRIBUTES, [["HELLO", "0.0"]]);
    show(raw, transformed);
    start();

    postFromAdmin(snapshot([nodeKey("0.0"), "Hello"]));
    postFromAdmin(patch(nodeKey("0.0"), "Hello!"));

    expect(postToAdmin.mock.calls).toEqual([[announcementOf(nodeKey("0.0")), ADMIN_ORIGIN]]);
    expect(textsOf(raw)).toEqual(["Hello!"]);
    expect(textsOf(transformed)).toEqual(["HELLO"]);
  });

  it("keeps the text nodes of another document apart", () => {
    const content = renderRichText(CONTENT_ATTRIBUTES, [["Hello", "0.0"]]);
    const linkedContent = renderRichText({ ...CONTENT_ATTRIBUTES, [DATA_VE_DOC_ID_ATTR]: "9" }, [
      ["Hello", "0.0"],
    ]);
    show(content, linkedContent);
    start();

    postFromAdmin(snapshot([nodeKey("0.0"), "Hello"]));
    postFromAdmin(patch(nodeKey("0.0"), "Hello!"));

    expect(postToAdmin.mock.calls).toEqual([
      [
        {
          ...announcementOf(),
          rendered: [
            { ...renderedDocument, keys: [nodeKey("0.0")] },
            { ...renderedDocument, docId: "9", keys: [nodeKey("0.0")] },
          ],
        },
        ADMIN_ORIGIN,
      ],
    ]);
    expect(textsOf(content)).toEqual(["Hello!"]);
    expect(textsOf(linkedContent)).toEqual(["Hello"]);
  });

  it("keeps a text field next to rich text an edit target and live", () => {
    const heading = document.createElement("h1");
    heading.textContent = markedText("Title", { ...renderedDocument, path: "title" });
    const content = renderRichText(CONTENT_ATTRIBUTES, [["Hello", "0.0"]]);
    show(heading, content);

    start({ mode: "always" });
    postFromAdmin(snapshot(["title", "Title", "Title!"], [nodeKey("0.0"), "Hello", "Hello!"]));

    expect(postToAdmin.mock.calls).toEqual([
      [announcementOf("title", nodeKey("0.0")), ADMIN_ORIGIN],
    ]);
    expect(Array.from(main.querySelectorAll(`[${DATA_VE_TARGET_ATTR}]`))).toEqual([
      heading,
      content,
    ]);
    expect(heading.textContent).toBe("Title!");
    expect(textsOf(content)).toEqual(["Hello!"]);
  });

  it("does not turn text nodes into edit targets", () => {
    const content = renderRichText(CONTENT_ATTRIBUTES, [
      ["Hello ", "0.0"],
      ["world", "0.1"],
    ]);
    show(content);

    start({ mode: "always" });

    expect(Array.from(main.querySelectorAll(`[${DATA_VE_TARGET_ATTR}]`))).toEqual([content]);
  });

  it("ignores text nodes outside a wrapper", () => {
    const stray = renderParagraph([["Hello", "0.0"]]);
    show(stray);

    start({ mode: "always" });

    expect(postToAdmin.mock.calls).toEqual([[announcementOf(), ADMIN_ORIGIN]]);
    expect(textsOf(stray)).toEqual(["Hello"]);
    expect(main.querySelector(`[${DATA_VE_TARGET_ATTR}]`)).toBeNull();
  });

  it("ignores a wrapper that addresses a row without a key", () => {
    const rowBody = renderRichText({ ...PAGE_ATTRIBUTES, [DATA_VE_PATH_ATTR]: "layout.0.body" }, [
      ["Hello", "0.0"],
    ]);
    show(rowBody);
    start();

    postFromAdmin(snapshot([nodeKey("0.0", "layout.0.body"), "Hello", "Hello!"]));

    expect(postToAdmin.mock.calls).toEqual([[announcementOf(), ADMIN_ORIGIN]]);
    expect(textsOf(rowBody)).toEqual(["Hello"]);
  });

  it("ignores a wrapper that does not name its collection", () => {
    const content = renderRichText({ [DATA_VE_PATH_ATTR]: "content" }, [["Hello", "0.0"]]);
    show(content);

    start();

    expect(postToAdmin.mock.calls).toEqual([[announcementOf(), ADMIN_ORIGIN]]);
    expect(textsOf(content)).toEqual(["Hello"]);
  });

  it("honours data-ve-live=off on the wrapper", () => {
    const content = renderRichText({ ...CONTENT_ATTRIBUTES, [DATA_VE_LIVE_ATTR]: VE_LIVE_OFF }, [
      ["Hello", "0.0"],
    ]);
    show(content);
    start();

    postFromAdmin(snapshot([nodeKey("0.0"), "Hello", "Hello!"]));

    expect(postToAdmin.mock.calls).toEqual([[announcementOf(), ADMIN_ORIGIN]]);
    expect(textsOf(content)).toEqual(["Hello"]);
  });

  it("ignores rich text read with a locale", () => {
    const content = renderRichText({ ...CONTENT_ATTRIBUTES, [DATA_VE_LOCALE_ATTR]: "en" }, [
      ["Hello", "0.0"],
    ]);
    show(content);
    start();

    postFromAdmin(snapshot([nodeKey("0.0"), "Hello", "Hello!"]));

    expect(postToAdmin.mock.calls).toEqual([[announcementOf(), ADMIN_ORIGIN]]);
    expect(textsOf(content)).toEqual(["Hello"]);
  });

  it("tracks the node again after React renders new text into it", async () => {
    const content = renderRichText(CONTENT_ATTRIBUTES, [["Hello", "0.0"]]);
    show(content);
    start();
    postToAdmin.mockClear();
    const newShape = "def456";

    textNodeOf(spansOf(content)[0]).data = nodeMarker("Saved", "1.0", newShape);
    await flushMutations();

    expect(postToAdmin.mock.calls).toEqual([
      [announcementOf(nodeKey("1.0", "content", newShape)), ADMIN_ORIGIN],
    ]);
    expect(textsOf(content)).toEqual(["Saved"]);

    postFromAdmin(snapshot([nodeKey("1.0", "content", newShape), "Saved"]));
    postFromAdmin(patch(nodeKey("0.0"), "Hello!"));
    postFromAdmin(patch(nodeKey("1.0", "content", newShape), "Saved!"));

    expect(textsOf(content)).toEqual(["Saved!"]);
  });

  it("paints the latest value when React renders the saved text of the same node again", async () => {
    const content = renderRichText(CONTENT_ATTRIBUTES, [["Hello", "0.0"]]);
    show(content);
    start();
    postFromAdmin(snapshot([nodeKey("0.0"), "Hello"]));
    postFromAdmin(patch(nodeKey("0.0"), "Hello!"));
    postToAdmin.mockClear();

    textNodeOf(spansOf(content)[0]).data = nodeMarker("Hello", "0.0");
    await flushMutations();

    expect(textsOf(content)).toEqual(["Hello!"]);
    expect(postToAdmin).not.toHaveBeenCalled();
  });

  it("follows a wrapper whose key changes", async () => {
    const content = renderRichText(
      {
        ...PAGE_ATTRIBUTES,
        [DATA_VE_KEY_ATTR]: "layout.row-a.body",
        [DATA_VE_PATH_ATTR]: "layout.0.body",
      },
      [["Hello", "0.0"]]
    );
    show(content);
    start();
    postToAdmin.mockClear();

    content.setAttribute(DATA_VE_KEY_ATTR, "layout.row-b.body");
    await flushMutations();

    expect(postToAdmin.mock.calls).toEqual([
      [announcementOf(nodeKey("0.0", "layout.row-b.body")), ADMIN_ORIGIN],
    ]);

    postFromAdmin(
      snapshot(
        [nodeKey("0.0", "layout.row-a.body"), "Hello", "Hello from A"],
        [nodeKey("0.0", "layout.row-b.body"), "Hello", "Hello from B"]
      )
    );

    expect(textsOf(content)).toEqual(["Hello from B"]);
  });

  it("stops patching the text nodes of a wrapper that loses its key", async () => {
    const content = renderRichText(
      {
        ...PAGE_ATTRIBUTES,
        [DATA_VE_KEY_ATTR]: "layout.row-a.body",
        [DATA_VE_PATH_ATTR]: "layout.0.body",
      },
      [["Hello", "0.0"]]
    );
    show(content);
    start();
    postFromAdmin(snapshot([nodeKey("0.0", "layout.row-a.body"), "Hello"]));

    content.removeAttribute(DATA_VE_KEY_ATTR);
    await flushMutations();
    postFromAdmin(patch(nodeKey("0.0", "layout.row-a.body"), "Hello!"));

    expect(textsOf(content)).toEqual(["Hello"]);
  });

  it("stays quiet when a wrapper changes nothing about its text nodes", async () => {
    const content = renderRichText(CONTENT_ATTRIBUTES, [["Hello", "0.0"]]);
    show(content);
    start();
    postFromAdmin(snapshot([nodeKey("0.0"), "Hello"]));
    postToAdmin.mockClear();

    content.append(document.createElement("hr"));
    await flushMutations();
    postFromAdmin(patch(nodeKey("0.0"), "Hello!"));

    expect(postToAdmin).not.toHaveBeenCalled();
    expect(textsOf(content)).toEqual(["Hello!"]);
  });

  it("forgets a text node the page wrote plain text into", async () => {
    const content = renderRichText(CONTENT_ATTRIBUTES, [["Hello", "0.0"]]);
    show(content);
    start();
    postFromAdmin(snapshot([nodeKey("0.0"), "Hello"]));

    textNodeOf(spansOf(content)[0]).data = "Hello";
    await flushMutations();
    content.append(document.createElement("hr"));
    await flushMutations();
    postFromAdmin(patch(nodeKey("0.0"), "Hello!"));

    expect(textsOf(content)).toEqual(["Hello"]);
  });

  it("tracks the text nodes of rich text that is rendered later", async () => {
    start();
    postToAdmin.mockClear();

    const content = renderRichText(CONTENT_ATTRIBUTES, [["Hello", "0.0"]]);
    show(content);
    await flushMutations();

    expect(postToAdmin.mock.calls).toEqual([[announcementOf(nodeKey("0.0")), ADMIN_ORIGIN]]);
    expect(textsOf(content)).toEqual(["Hello"]);
  });

  it("puts the markers back when it is disposed", () => {
    const content = renderRichText(CONTENT_ATTRIBUTES, [["Hello", "0.0"]]);
    show(content);
    start();

    overlay?.dispose();
    overlay = undefined;

    expect(textsOf(content)).toEqual([nodeMarker("Hello", "0.0")]);
  });
});
