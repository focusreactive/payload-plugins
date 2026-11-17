import type { LexicalEditor } from "lexical";
import type { MockInstance } from "vitest";

import { $getRoot, $isTextNode } from "lexical";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Overlay, OverlayCtx } from "../../src/client/createOverlay";

import { createOverlay } from "../../src/client/createOverlay";
import {
  EDIT_SAVE_PAUSE_MS,
  EDIT_SEND_PAUSE_MS,
} from "../../src/client/inlineEditing/editTransport";
import { DATA_VE_OPAQUE_ATTR } from "../../src/client/inlineEditing/richText/opaqueNode";
import { DATA_VE_RICH_TEXT_TOOLBAR_ATTR } from "../../src/client/inlineEditing/richText/toolbar";
import { DATA_VE_EDITED_ATTR } from "../../src/client/inlineEditing/richTextTwin";
import { DATA_VE_SAVE_STATUS_ATTR } from "../../src/client/inlineEditing/saveStatus";
import { DATA_VE_EDITING_ATTR } from "../../src/client/inlineEditing/textEditing";
import { DATA_VE_ACTION_ATTR } from "../../src/client/overlay/constants";
import { identityAttrsOf } from "../../src/client/withVisualEditingPath";
import {
  DATA_VE_LOCALE_ATTR,
  VE_FIELD_EDIT_PATH,
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_MESSAGE_TYPE,
  VE_RICH_TEXT_EDIT_TYPE,
  VE_RICH_TEXT_STATE_REQUEST_TYPE,
  VE_RICH_TEXT_STATE_TYPE,
  VE_RICH_TEXT_VALUE_PATH,
} from "../../src/shared/protocol";

import { markedText, markedTextNode } from "../support/markedData";
import { click, overlayCtx } from "../support/overlay";
import { postFromAdmin, restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";

const PAYLOAD_API = "https://cms.example.com/api";

const PAGE = { collectionSlug: "page", docId: "1", kind: "collection" } as const;

const BODY = { ...PAGE, key: "body", locale: "en" };

const SHAPE = "abc123";

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

const paragraph = (...children: object[]) =>
  element("paragraph", children, { textFormat: 0, textStyle: "" });

const stateOf = (...children: object[]) => ({ root: element("root", children) });

const CALLOUT = {
  fields: { blockType: "callout", id: "callout-1" },
  format: "",
  type: "block",
  version: 2,
};

const STATE = stateOf(paragraph(text("Hello world")), CALLOUT);

const lexicalOf = (twin: Element): LexicalEditor =>
  (twin as unknown as { __lexicalEditor: LexicalEditor }).__lexicalEditor;

const typeInto = (twin: Element, typed: string) =>
  lexicalOf(twin).update(
    () => {
      const first = $getRoot().getFirstDescendant();
      if ($isTextNode(first)) first.setTextContent(typed);
    },
    { discrete: true }
  );

const hover = (target: Element) =>
  target.dispatchEvent(new MouseEvent("pointerover", { bubbles: true }));

const press = (target: Element, key: string) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }));

const pressOutside = () =>
  document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));

const twinOf = (target: HTMLElement) => target.nextElementSibling as HTMLElement;

const isShown = (target: HTMLElement) => target.style.display !== "none";

const statusLabel = () =>
  document.querySelector(`[${DATA_VE_SAVE_STATUS_ATTR}]`)?.shadowRoot?.querySelector("span")
    ?.textContent;

const messagesOfType = (post: ReturnType<typeof vi.fn>, type: string) =>
  post.mock.calls.map(([message]) => message as { type: string }).filter((m) => m.type === type);

describe("editing rich text on the page", () => {
  let main: HTMLElement;
  let wrapper: HTMLElement;
  let overlay: Overlay;
  let ctx: OverlayCtx;
  let fetchApi: ReturnType<typeof vi.fn>;
  let open: MockInstance<typeof window.open>;
  let storedState: unknown;
  let valueStatus: number;
  let isSaved: boolean;
  let onEdited: ReturnType<typeof vi.fn>;

  const renderRichText = (path = "body") => {
    const rendered = document.createElement("section");
    rendered.className = "prose wide";
    for (const [name, value] of Object.entries(identityAttrsOf({ ...PAGE, path }))) {
      rendered.setAttribute(name, value);
    }
    const line = document.createElement("p");
    line.textContent = markedTextNode("Hello world", "0.0", SHAPE);
    rendered.append(line);
    main.append(rendered);
    return rendered;
  };

  const start = (overrides: Partial<OverlayCtx> = {}) => {
    ctx = overlayCtx({
      inlineEditing: true,
      instantPreview: true,
      locale: "en",
      mode: "hover",
      onEdited,
      payloadApi: PAYLOAD_API,
      ...overrides,
    });
    overlay = createOverlay(main, () => ctx);
  };

  const settle = async () => {
    await vi.dynamicImportSettled();
    await vi.advanceTimersByTimeAsync(0);
  };

  const hoverUntilReady = async (target: Element = wrapper) => {
    hover(target);
    await settle();
  };

  const beginEdit = async () => {
    await hoverUntilReady();
    click(wrapper);
    return twinOf(wrapper);
  };

  const requestsTo = (path: string) =>
    fetchApi.mock.calls
      .filter(([url]) => url === `${PAYLOAD_API}${path}`)
      .map(([, init]) => JSON.parse((init as RequestInit).body as string));

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    main = document.createElement("main");
    document.body.append(main);
    wrapper = renderRichText();
    storedState = STATE;
    valueStatus = 200;
    isSaved = true;
    onEdited = vi.fn();
    fetchApi = vi.fn((url: string) => {
      const isValue = url.endsWith(VE_RICH_TEXT_VALUE_PATH);
      const body = isValue
        ? { value: valueStatus === 200 ? storedState : null }
        : { saved: isSaved };
      const ok = isValue ? valueStatus === 200 : true;
      return Promise.resolve({ json: () => Promise.resolve(body), ok } as Response);
    });
    vi.stubGlobal("fetch", fetchApi);
    open = vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    overlay.dispose();
    restorePreviewWindow();
    vi.unstubAllGlobals();
    open.mockRestore();
    document.getSelection()?.removeAllRanges();
    vi.useRealTimers();
  });

  describe("on a page of its own", () => {
    beforeEach(() => start());

    it("asks for the stored state when the pointer enters the rich text", async () => {
      await hoverUntilReady();

      expect(requestsTo(VE_RICH_TEXT_VALUE_PATH)).toEqual([BODY]);
    });

    it("opens the field in the admin while the state has not arrived", () => {
      hover(wrapper);
      click(wrapper);

      expect(twinOf(wrapper)).toBeNull();
      expect(open).toHaveBeenCalledTimes(1);
    });

    it("opens the field in the admin when the state is refused", async () => {
      valueStatus = 422;
      await hoverUntilReady();

      click(wrapper);

      expect(twinOf(wrapper)).toBeNull();
      expect(open).toHaveBeenCalledTimes(1);
    });

    it("opens the field in the admin when the stored state cannot be edited", async () => {
      storedState = stateOf(text("A text node the root cannot hold"));
      await hoverUntilReady();

      click(wrapper);

      expect(twinOf(wrapper)).toBeNull();
      expect(isShown(wrapper)).toBe(true);
      expect(open).toHaveBeenCalledTimes(1);
    });

    it("edits in a twin of the wrapper and hides the wrapper the page rendered", async () => {
      const twin = await beginEdit();

      expect(twin.tagName).toBe("SECTION");
      expect(twin.className).toBe("prose wide");
      expect(twin.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
      expect(twin.getAttribute("contenteditable")).toBe("true");
      expect(twin.querySelector("p")?.textContent).toBe("Hello world");
      expect(twin.querySelector(`[${DATA_VE_OPAQUE_ATTR}]`)?.textContent).toBe("block: callout");
      expect(isShown(wrapper)).toBe(false);
      expect(wrapper.querySelector("p")?.textContent).toBe("Hello world");
      expect(open).not.toHaveBeenCalled();
    });

    it("saves the state the editor typed once the typing pauses, with every other node as it was", async () => {
      const twin = await beginEdit();

      typeInto(twin, "Hello there");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      expect(requestsTo(VE_FIELD_EDIT_PATH)).toEqual([
        { ...BODY, state: stateOf(paragraph(text("Hello there")), CALLOUT) },
      ]);
      expect(onEdited).toHaveBeenCalledTimes(1);
    });

    it("saves at once when the page is left before the pause ends", async () => {
      const twin = await beginEdit();
      typeInto(twin, "Hello there");

      window.dispatchEvent(new Event("pagehide"));
      await settle();

      expect(requestsTo(VE_FIELD_EDIT_PATH)).toHaveLength(1);
    });

    it("puts the wrapper back on Escape and saves nothing when nothing was typed", async () => {
      const twin = await beginEdit();

      press(twin, "Escape");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      expect(twin.isConnected).toBe(false);
      expect(isShown(wrapper)).toBe(true);
      expect(wrapper.hasAttribute("style")).toBe(false);
      expect(requestsTo(VE_FIELD_EDIT_PATH)).toEqual([]);
    });

    it("sends the stored state again on Escape when an edit was already sent", async () => {
      const twin = await beginEdit();
      typeInto(twin, "Hello there");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      press(twin, "Escape");
      await settle();

      expect(requestsTo(VE_FIELD_EDIT_PATH).map(({ state }) => state)).toEqual([
        stateOf(paragraph(text("Hello there")), CALLOUT),
        STATE,
      ]);
      expect(isShown(wrapper)).toBe(true);
    });

    it("commits on a press outside and keeps a read-only twin of what was saved", async () => {
      const twin = await beginEdit();
      typeInto(twin, "Hello there");

      pressOutside();
      await settle();

      const kept = twinOf(wrapper);
      expect(requestsTo(VE_FIELD_EDIT_PATH)).toHaveLength(1);
      expect(twin.isConnected).toBe(false);
      expect(kept.hasAttribute(DATA_VE_EDITED_ATTR)).toBe(true);
      expect(kept.hasAttribute("contenteditable")).toBe(false);
      expect(kept.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(false);
      expect(kept.querySelector("p")?.textContent).toBe("Hello there");
      expect(isShown(wrapper)).toBe(false);
      expect(document.querySelector(`[${DATA_VE_RICH_TEXT_TOOLBAR_ATTR}]`)).toBeNull();
    });

    it("does not commit on a press inside the twin", async () => {
      const twin = await beginEdit();

      twin.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));

      expect(twin.isConnected).toBe(true);
      expect(twin.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
    });

    it("shows the wrapper again after a commit that changed nothing", async () => {
      const twin = await beginEdit();

      pressOutside();

      expect(twin.isConnected).toBe(false);
      expect(twinOf(wrapper)).toBeNull();
      expect(isShown(wrapper)).toBe(true);
    });

    it("drops the read-only twin when the site renders the wrapper again after the save", async () => {
      const twin = await beginEdit();
      typeInto(twin, "Hello there");
      pressOutside();
      await settle();
      const kept = twinOf(wrapper);

      wrapper.querySelector("p")!.textContent = "Hello there";
      await settle();

      expect(kept.isConnected).toBe(false);
      expect(isShown(wrapper)).toBe(true);
    });

    it("keeps the read-only twin over a render that came before the edit was saved", async () => {
      const twin = await beginEdit();
      typeInto(twin, "Hello there");
      pressOutside();
      const kept = twinOf(wrapper);

      wrapper.querySelector("p")!.textContent = "Hello";
      await settle();

      expect(kept.isConnected).toBe(true);
      expect(isShown(wrapper)).toBe(false);
    });

    it("shows the wrapper at once when the site rendered the saved edit before the commit", async () => {
      const twin = await beginEdit();
      typeInto(twin, "Hello there");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);
      wrapper.querySelector("p")!.textContent = "Hello there";
      await settle();

      pressOutside();

      expect(twin.isConnected).toBe(false);
      expect(twinOf(wrapper)).toBeNull();
      expect(isShown(wrapper)).toBe(true);
    });

    it("drops the read-only twin when the overlay is disposed", async () => {
      const twin = await beginEdit();
      typeInto(twin, "Hello there");
      pressOutside();
      const kept = twinOf(wrapper);

      overlay.dispose();

      expect(kept.isConnected).toBe(false);
      expect(isShown(wrapper)).toBe(true);
    });

    it("edits the read-only twin again from the state it saved", async () => {
      const first = await beginEdit();
      typeInto(first, "Hello there");
      pressOutside();
      await settle();
      const kept = twinOf(wrapper);

      click(kept);
      const second = kept.nextElementSibling as HTMLElement;
      typeInto(second, "Hello again");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      expect(second.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
      expect(isShown(kept)).toBe(false);
      expect(requestsTo(VE_FIELD_EDIT_PATH).at(-1)).toEqual({
        ...BODY,
        state: stateOf(paragraph(text("Hello again")), CALLOUT),
      });
    });

    it("shows the saved twin again when a second edit is cancelled", async () => {
      const first = await beginEdit();
      typeInto(first, "Hello there");
      pressOutside();
      await settle();
      const kept = twinOf(wrapper);
      click(kept);

      press(kept.nextElementSibling as HTMLElement, "Escape");

      expect(kept.isConnected).toBe(true);
      expect(isShown(kept)).toBe(true);
      expect(isShown(wrapper)).toBe(false);
    });

    it("says that an edit the endpoint refused is not saved and keeps what was typed", async () => {
      isSaved = false;
      const twin = await beginEdit();
      typeInto(twin, "Hello there");

      pressOutside();
      await settle();

      expect(statusLabel()).toBe("Not saved");
      expect(onEdited).not.toHaveBeenCalled();
      expect(twinOf(wrapper).querySelector("p")?.textContent).toBe("Hello there");
    });

    it("ends the edit when the switch is turned off", async () => {
      const twin = await beginEdit();

      ctx = { ...ctx, inlineEditing: false };
      overlay.applyMode();

      expect(twin.isConnected).toBe(false);
      expect(isShown(wrapper)).toBe(true);
    });

    it("ends a rich text edit when a text field is edited, and the other way round", async () => {
      const heading = document.createElement("h1");
      heading.textContent = markedText("Title", { ...PAGE, path: "title" });
      main.append(heading);
      await settle();
      const twin = await beginEdit();

      click(heading);
      expect(twin.isConnected).toBe(false);
      expect(heading.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);

      await hoverUntilReady();
      click(wrapper);
      expect(heading.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(false);
      expect(twinOf(wrapper).hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
    });

    describe("asks nothing and edits nothing", () => {
      const staysAsItIs = async (target: HTMLElement) => {
        await settle();
        await hoverUntilReady(target);
        click(target);

        expect(requestsTo(VE_RICH_TEXT_VALUE_PATH)).toEqual([]);
        expect(target.nextElementSibling?.hasAttribute(DATA_VE_EDITING_ATTR) ?? false).toBe(false);
      };

      it("for rich text read in every locale", async () => {
        wrapper.setAttribute(DATA_VE_LOCALE_ATTR, "en");

        await staysAsItIs(wrapper);
      });

      it("for a wrapper that shows no rich text", async () => {
        const card = renderRichText("card");
        card.textContent = "";
        card.append(document.createElement("img"));

        await staysAsItIs(card);
      });

      it("for rich text of a block inside another rich text, which is asked for alone", async () => {
        const nested = renderRichText("layout.0.body");
        nested.setAttribute("data-ve-key", "layout.row.body");
        wrapper.append(nested);
        await settle();

        await hoverUntilReady(nested);
        click(nested);

        expect(requestsTo(VE_RICH_TEXT_VALUE_PATH)).toEqual([BODY]);
        expect(nested.nextElementSibling).toBeNull();
        expect(twinOf(wrapper)).toBeNull();
      });

      it("while the switch is off", async () => {
        ctx = { ...ctx, inlineEditing: false };

        await staysAsItIs(wrapper);
      });
    });

    it("offers no replacement for an image inside rich text", async () => {
      const figure = document.createElement("figure");
      for (const [name, value] of Object.entries(identityAttrsOf({ ...PAGE, path: "image" }))) {
        figure.setAttribute(name, value);
      }
      figure.append(document.createElement("img"));
      wrapper.append(figure);
      await settle();

      figure.dispatchEvent(new MouseEvent("mouseenter"));

      const button = document.querySelector<HTMLButtonElement>(`[${DATA_VE_ACTION_ATTR}]`);
      expect(button?.style.display).toBe("none");
    });
  });

  describe("on a page next to the admin", () => {
    const postToAdmin = vi.fn();

    const openForm = async () => {
      const heading = document.createElement("h1");
      heading.textContent = markedText("Title", { ...PAGE, path: "title" });
      main.append(heading);
      await settle();
      postFromAdmin({
        ...PAGE,
        fields: [{ key: "title", saved: "Title", value: "Title" }],
        locale: "en",
        type: VE_FIELD_SNAPSHOT_TYPE,
      });
    };

    const answerState = () =>
      postFromAdmin({ ...BODY, state: STATE, type: VE_RICH_TEXT_STATE_TYPE });

    beforeEach(async () => {
      postToAdmin.mockClear();
      stubAdminWindow({ postMessage: postToAdmin });
      start();
      await openForm();
    });

    it("asks the form for the state, not the endpoint", async () => {
      await hoverUntilReady();

      expect(messagesOfType(postToAdmin, VE_RICH_TEXT_STATE_REQUEST_TYPE)).toEqual([
        { ...BODY, type: VE_RICH_TEXT_STATE_REQUEST_TYPE },
      ]);
      expect(fetchApi).not.toHaveBeenCalled();
    });

    it("asks nothing of a document the admin holds no form of", async () => {
      const other = renderRichText();
      other.setAttribute("data-ve-doc-id", "2");
      await settle();

      await hoverUntilReady(other);

      expect(messagesOfType(postToAdmin, VE_RICH_TEXT_STATE_REQUEST_TYPE)).toEqual([]);
    });

    it("opens the field in the form until the state arrived, and when it is refused", async () => {
      await hoverUntilReady();
      click(wrapper);
      postFromAdmin({ ...BODY, type: VE_FIELD_EDIT_REFUSED_TYPE });
      click(wrapper);

      expect(twinOf(wrapper)?.hasAttribute(DATA_VE_EDITING_ATTR) ?? false).toBe(false);
      expect(messagesOfType(postToAdmin, VE_MESSAGE_TYPE)).toHaveLength(2);
    });

    it("ignores a state from a window that is not the admin", async () => {
      await hoverUntilReady();
      postFromAdmin({ ...BODY, state: STATE, type: VE_RICH_TEXT_STATE_TYPE }, { source: {} });

      click(wrapper);

      expect(twinOf(wrapper)?.hasAttribute(DATA_VE_EDITING_ATTR) ?? false).toBe(false);
    });

    it("edits once the state arrived and shows the field in the form without taking the focus", async () => {
      await hoverUntilReady();
      answerState();

      click(wrapper);

      expect(twinOf(wrapper).hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
      expect(messagesOfType(postToAdmin, VE_MESSAGE_TYPE)).toEqual([
        {
          ...PAGE,
          focus: false,
          key: undefined,
          locale: "en",
          path: "body",
          type: VE_MESSAGE_TYPE,
        },
      ]);
    });

    it("posts the edited state to the form once the typing pauses", async () => {
      await hoverUntilReady();
      answerState();
      click(wrapper);

      typeInto(twinOf(wrapper), "Hello there");
      await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);

      expect(messagesOfType(postToAdmin, VE_RICH_TEXT_EDIT_TYPE)).toEqual([
        {
          ...BODY,
          state: stateOf(paragraph(text("Hello there")), CALLOUT),
          type: VE_RICH_TEXT_EDIT_TYPE,
        },
      ]);
      expect(statusLabel()).toBe("Unsaved changes");
    });

    it("removes the twin and shows the wrapper when the edit is committed", async () => {
      await hoverUntilReady();
      answerState();
      click(wrapper);
      const twin = twinOf(wrapper);
      typeInto(twin, "Hello there");

      pressOutside();

      expect(twin.isConnected).toBe(false);
      expect(twinOf(wrapper)?.hasAttribute(DATA_VE_EDITED_ATTR) ?? false).toBe(false);
      expect(isShown(wrapper)).toBe(true);
      expect(messagesOfType(postToAdmin, VE_RICH_TEXT_EDIT_TYPE)).toHaveLength(1);
    });

    it("says that an edit the form refused is not saved", async () => {
      await hoverUntilReady();
      answerState();
      click(wrapper);
      typeInto(twinOf(wrapper), "Hello there");
      await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);

      postFromAdmin({ ...BODY, type: VE_FIELD_EDIT_REFUSED_TYPE });

      expect(statusLabel()).toBe("Not saved");
    });
  });
});
