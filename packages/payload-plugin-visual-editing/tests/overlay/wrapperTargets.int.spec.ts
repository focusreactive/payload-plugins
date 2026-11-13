import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Overlay } from "../../src/client/createOverlay";

import { DATA_VE_TARGET_ATTR } from "../../src/client/overlay/constants";
import { createOverlay } from "../../src/client/createOverlay";
import {
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_DOC_ID_ATTR,
  DATA_VE_KEY_ATTR,
  DATA_VE_KIND_ATTR,
  DATA_VE_LOCALE_ATTR,
  DATA_VE_PATH_ATTR,
  VE_IDENTITY_ATTRS,
  VE_MESSAGE_TYPE,
} from "../../src/shared/protocol";

import { markedText } from "../support/markedData";
import { click, overlayCtx } from "../support/overlay";
import { restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";
import { flushMutations } from "../support/time";

const ctx = overlayCtx();

describe("an element marked with withVisualEditingPath", () => {
  let main: HTMLElement;
  let richText: HTMLElement;
  let overlay: Overlay;
  let postToAdmin: ReturnType<typeof vi.fn>;

  const openedField = () => postToAdmin.mock.calls.at(-1)?.[0];

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    richText = document.createElement("div");
    richText.setAttribute(DATA_VE_PATH_ATTR, "blocks.0.content");
    richText.setAttribute(DATA_VE_COLLECTION_ATTR, "page");
    richText.setAttribute(DATA_VE_KIND_ATTR, "collection");
    richText.setAttribute(DATA_VE_DOC_ID_ATTR, "1");
    richText.textContent = "Body of the first row";
    main.append(richText);
    document.body.append(main);
    postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });
    overlay = createOverlay(main, () => ctx);
  });

  afterEach(() => {
    overlay.dispose();
    restorePreviewWindow();
  });

  it("opens the field it is marked with", () => {
    click(richText);

    expect(openedField()).toMatchObject({ path: "blocks.0.content", type: VE_MESSAGE_TYPE });
  });

  it("opens the field of the row it shows after a move rendered another path into it", async () => {
    richText.setAttribute(DATA_VE_PATH_ATTR, "blocks.1.content");
    await flushMutations();

    click(richText);

    expect(richText.getAttribute(DATA_VE_TARGET_ATTR)).toBe("blocks.1.content");
    expect(openedField()).toMatchObject({ path: "blocks.1.content" });
  });

  it("opens the field by the stable key it states", async () => {
    richText.setAttribute(DATA_VE_KEY_ATTR, "blocks.row-a.content");
    await flushMutations();

    click(richText);

    expect(openedField()).toMatchObject({ key: "blocks.row-a.content", path: "blocks.0.content" });
  });

  it("opens the field of the row it shows after another key was rendered into it at the same path", async () => {
    richText.setAttribute(DATA_VE_KEY_ATTR, "blocks.row-a.content");
    await flushMutations();

    richText.setAttribute(DATA_VE_KEY_ATTR, "blocks.row-b.content");
    await flushMutations();
    click(richText);

    expect(openedField()).toMatchObject({ key: "blocks.row-b.content", path: "blocks.0.content" });
  });

  it("opens the document it shows after another document was rendered into it", async () => {
    richText.setAttribute(DATA_VE_DOC_ID_ATTR, "2");
    await flushMutations();

    click(richText);

    expect(openedField()).toMatchObject({ docId: "2", path: "blocks.0.content" });
  });

  it("opens the collection it shows after another collection was rendered into it", async () => {
    richText.setAttribute(DATA_VE_COLLECTION_ATTR, "post");
    await flushMutations();

    click(richText);

    expect(openedField()).toMatchObject({ collectionSlug: "post" });
  });

  it("opens the document whose title a card shows after another card was rendered into it", async () => {
    const titleOfPost = (docId: string, text: string) =>
      markedText(text, {
        collectionSlug: "post",
        docId,
        kind: "collection",
        path: "title",
      });
    const card = document.createElement("h2");
    card.textContent = titleOfPost("8", "Older post");
    main.append(card);
    await flushMutations();

    (card.firstChild as Text).data = titleOfPost("9", "Newer post");
    await flushMutations();
    click(card);

    expect(openedField()).toMatchObject({ collectionSlug: "post", docId: "9", path: "title" });
  });

  it("opens the field in the locale it states", async () => {
    richText.setAttribute(DATA_VE_LOCALE_ATTR, "de");
    await flushMutations();

    click(richText);

    expect(openedField()).toMatchObject({ locale: "de", path: "blocks.0.content" });
  });

  it("becomes an edit target when the path is rendered into an element that had none", async () => {
    const lateWrapper = document.createElement("div");
    main.append(lateWrapper);
    await flushMutations();

    lateWrapper.setAttribute(DATA_VE_COLLECTION_ATTR, "page");
    lateWrapper.setAttribute(DATA_VE_PATH_ATTR, "blocks.2.content");
    await flushMutations();

    expect(lateWrapper.getAttribute(DATA_VE_TARGET_ATTR)).toBe("blocks.2.content");
  });

  it("stops being an edit target when React removes the marker attributes", async () => {
    for (const attribute of VE_IDENTITY_ATTRS) richText.removeAttribute(attribute);
    await flushMutations();
    postToAdmin.mockClear();

    click(richText);

    expect(richText.hasAttribute(DATA_VE_TARGET_ATTR)).toBe(false);
    expect(richText.style.outline).toBe("");
    expect(postToAdmin).not.toHaveBeenCalled();
  });

  it("is the edit target of the marked text rendered into it when its marker attributes are removed", async () => {
    for (const attribute of VE_IDENTITY_ATTRS) richText.removeAttribute(attribute);
    richText.textContent = markedText("Summary of the first row", {
      collectionSlug: "page",
      docId: "1",
      kind: "collection",
      path: "blocks.0.summary",
    });
    await flushMutations();

    click(richText);

    expect(richText.getAttribute(DATA_VE_TARGET_ATTR)).toBe("blocks.0.summary");
    expect(openedField()).toMatchObject({ path: "blocks.0.summary" });
  });

  it("keeps the wrappers around it when it loses its own marker", async () => {
    const section = document.createElement("section");
    section.setAttribute(DATA_VE_COLLECTION_ATTR, "page");
    section.setAttribute(DATA_VE_PATH_ATTR, "blocks.0");
    main.append(section);
    section.append(richText);
    await flushMutations();

    for (const attribute of VE_IDENTITY_ATTRS) richText.removeAttribute(attribute);
    await flushMutations();

    expect(section.getAttribute(DATA_VE_TARGET_ATTR)).toBe("blocks.0");
    expect(richText.hasAttribute(DATA_VE_TARGET_ATTR)).toBe(false);
  });
});
