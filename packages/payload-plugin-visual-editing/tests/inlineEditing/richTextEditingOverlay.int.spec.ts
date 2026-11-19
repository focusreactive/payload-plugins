import type { LexicalEditor } from "lexical";
import type { MockInstance } from "vitest";

import {
  $createNodeSelection,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  KEY_BACKSPACE_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Overlay, OverlayCtx } from "../../src/client/createOverlay";

import { createOverlay } from "../../src/client/createOverlay";
import {
  EDIT_SAVE_PAUSE_MS,
  EDIT_SEND_PAUSE_MS,
} from "../../src/client/inlineEditing/editTransport";
import { DATA_VE_OPAQUE_ATTR } from "../../src/client/inlineEditing/richText/opaqueNode";
import { DATA_VE_RICH_TEXT_TOOLBAR_ATTR } from "../../src/client/inlineEditing/richText/toolbar";
import {
  RICH_TEXT_CHECK_PAUSE_MS,
  RICH_TEXT_STATE_FRESH_MS,
  RICH_TEXT_STATE_TIME_LIMIT_MS,
} from "../../src/client/inlineEditing/richTextEditing";
import {
  DATA_VE_EDIT_STARTING_ATTR,
  DATA_VE_EDITED_ATTR,
} from "../../src/client/inlineEditing/richTextTwin";
import { DATA_VE_SAVE_STATUS_ATTR } from "../../src/client/inlineEditing/saveStatus";
import { DATA_VE_EDITING_ATTR } from "../../src/client/inlineEditing/textEditing";
import { DATA_VE_ACTION_ATTR } from "../../src/client/overlay/constants";
import { identityAttrsOf } from "../../src/client/withVisualEditingPath";
import {
  DATA_VE_LOCALE_ATTR,
  DATA_VE_PATH_ATTR,
  VE_FIELD_EDIT_PATH,
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_MESSAGE_TYPE,
  VE_DOCUMENT_SAVED_TYPE,
  VE_FIELD_PATCH_TYPE,
  VE_RICH_TEXT_EDIT_ENDED_TYPE,
  VE_RICH_TEXT_EDIT_TYPE,
  VE_RICH_TEXT_STATE_REFUSED_TYPE,
  VE_RICH_TEXT_STRUCTURE_TYPE,
  VE_RICH_TEXT_STATE_REQUEST_TYPE,
  VE_RICH_TEXT_STATE_TYPE,
  VE_RICH_TEXT_VALUE_PATH,
} from "../../src/shared/protocol";

import { markedText, markedTextNode } from "../support/markedData";
import { click, overlayCtx } from "../support/overlay";
import { postFromAdmin, restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";
import { measureSelectionsAsEmpty } from "../support/selectionRects";

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

const FORMATS = {
  hasLinks: true,
  hasQuotes: true,
  headings: ["h2", "h3"],
  lists: ["bullet", "number"],
  textFormats: 11,
};

const BROKEN_EDITOR = {
  startEditSession: () => {
    throw new Error("broken");
  },
};

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

const selectTheBlock = (twin: Element) =>
  lexicalOf(twin).update(
    () => {
      const selection = $createNodeSelection();
      selection.add($getRoot().getLastChildOrThrow().getKey());
      $setSelection(selection);
    },
    { discrete: true }
  );

const pressBackspace = (twin: Element) =>
  lexicalOf(twin).update(
    () =>
      lexicalOf(twin).dispatchCommand(
        KEY_BACKSPACE_COMMAND,
        new KeyboardEvent("keydown", { cancelable: true })
      ),
    { discrete: true }
  );

const caretOf = (twin: Element) =>
  lexicalOf(twin)
    .getEditorState()
    .read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return null;
      const { anchor } = selection;
      return { offset: anchor.offset, text: anchor.getNode().getTextContent() };
    });

const hover = (target: Element) =>
  target.dispatchEvent(new MouseEvent("pointerover", { bubbles: true }));

const movePointerOver = (target: Element) =>
  target.dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));

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

type Hit = { offset: number; offsetNode: Node } | null;

const hitBy = (hitAt: (x: number, y: number) => Hit) =>
  Object.assign(document, { caretPositionFromPoint: hitAt });

const lineOf = (target: HTMLElement, index = 0) =>
  target.querySelectorAll("p")[index]!.firstChild as Text;

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
      richTextEditor: () => import("../../src/rich-text"),
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
    measureSelectionsAsEmpty();
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
        ? { formats: FORMATS, value: valueStatus === 200 ? storedState : null }
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

    it("takes a click before the state arrived and starts the edit when it arrives", async () => {
      const event = click(wrapper);

      expect(event.defaultPrevented).toBe(true);
      expect(twinOf(wrapper)).toBeNull();
      expect(open).not.toHaveBeenCalled();

      await settle();

      expect(twinOf(wrapper).hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
      expect(requestsTo(VE_RICH_TEXT_VALUE_PATH)).toEqual([BODY]);
      expect(open).not.toHaveBeenCalled();
    });

    it("asks once for a click that is repeated while the state is on its way", async () => {
      click(wrapper);
      click(wrapper);
      await settle();

      expect(requestsTo(VE_RICH_TEXT_VALUE_PATH)).toHaveLength(1);
      expect(open).not.toHaveBeenCalled();
    });

    it("opens the field in the admin when the state is refused", async () => {
      valueStatus = 422;

      click(wrapper);
      await settle();

      expect(twinOf(wrapper)).toBeNull();
      expect(open).toHaveBeenCalledTimes(1);
    });

    it("opens the field in the admin when the answer names no formats", async () => {
      fetchApi.mockImplementationOnce(() =>
        Promise.resolve({ json: () => Promise.resolve({ value: STATE }), ok: true } as Response)
      );

      click(wrapper);
      await settle();

      expect(twinOf(wrapper)).toBeNull();
      expect(open).toHaveBeenCalledTimes(1);
    });

    it("opens the field in the admin when the state does not arrive in time", async () => {
      fetchApi.mockImplementationOnce(() => new Promise(() => undefined));
      click(wrapper);

      await vi.advanceTimersByTimeAsync(RICH_TEXT_STATE_TIME_LIMIT_MS - 1);
      expect(open).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(open).toHaveBeenCalledTimes(1);
      expect(twinOf(wrapper)).toBeNull();
    });

    it("opens the field in the admin when the stored state cannot be edited", async () => {
      storedState = stateOf(text("A text node the root cannot hold"));

      click(wrapper);
      await settle();

      expect(twinOf(wrapper)).toBeNull();
      expect(isShown(wrapper)).toBe(true);
      expect(wrapper.hasAttribute("style")).toBe(false);
      expect(open).toHaveBeenCalledTimes(1);
    });

    it("opens the field in the admin when the editor cannot be loaded", async () => {
      ctx = { ...ctx, richTextEditor: () => Promise.reject(new Error("offline")) };

      click(wrapper);
      await settle();

      expect(twinOf(wrapper)).toBeNull();
      expect(open).toHaveBeenCalledTimes(1);
    });

    it("puts the wrapper back and opens the field in the admin when the editor throws as it starts", async () => {
      ctx = { ...ctx, richTextEditor: () => Promise.resolve(BROKEN_EDITOR) };

      click(wrapper);
      await settle();

      expect(twinOf(wrapper)).toBeNull();
      expect(isShown(wrapper)).toBe(true);
      expect(open).toHaveBeenCalledTimes(1);
    });

    it("leaves rich text to the admin on a page that was given no editor", async () => {
      ctx = { ...ctx, richTextEditor: undefined };

      await hoverUntilReady();
      const event = click(wrapper);
      await settle();

      expect(requestsTo(VE_RICH_TEXT_VALUE_PATH)).toEqual([]);
      expect(twinOf(wrapper)).toBeNull();
      expect(event.defaultPrevented).toBe(true);
      expect(open).toHaveBeenCalledTimes(1);
    });

    describe("the caret", () => {
      const addLine = () => {
        const line = document.createElement("p");
        line.textContent = markedTextNode("Second line", "1.0", SHAPE);
        wrapper.append(line);
        storedState = stateOf(paragraph(text("Hello world")), paragraph(text("Second line")));
      };

      afterEach(() => {
        Reflect.deleteProperty(document, "caretPositionFromPoint");
        Reflect.deleteProperty(Range.prototype, "getClientRects");
      });

      it("is put where the click hit the text of the wrapper", async () => {
        await hoverUntilReady();
        hitBy(() => ({ offset: 5, offsetNode: lineOf(wrapper) }));

        click(wrapper);

        expect(caretOf(twinOf(wrapper))).toEqual({ offset: 5, text: "Hello world" });
      });

      it("is put where the click was when the state arrives later and the page has moved since", async () => {
        hitBy(() => ({ offset: 3, offsetNode: lineOf(wrapper) }));
        click(wrapper);
        hitBy(() => ({ offset: 9, offsetNode: lineOf(wrapper) }));

        await settle();

        expect(caretOf(twinOf(wrapper))).toEqual({ offset: 3, text: "Hello world" });
      });

      it("counts the text before the paragraph that was clicked", async () => {
        addLine();
        await hoverUntilReady();
        hitBy(() => ({ offset: 6, offsetNode: lineOf(wrapper, 1) }));

        click(wrapper);

        expect(caretOf(twinOf(wrapper))).toEqual({ offset: 6, text: "Second line" });
      });

      it("is put at the nearest text when the click hit none", async () => {
        addLine();
        await hoverUntilReady();
        const rects = new Map([
          [lineOf(wrapper), new DOMRect(0, 0, 100, 20)],
          [lineOf(wrapper, 1), new DOMRect(0, 40, 100, 20)],
        ]);
        Object.assign(Range.prototype, {
          getClientRects(this: Range) {
            const rect = rects.get(this.startContainer as Text);
            return rect ? [rect] : [];
          },
        });
        hitBy((x, y) =>
          y >= 40 && y <= 60 && x <= 100
            ? { offset: 11, offsetNode: lineOf(wrapper, 1) }
            : { offset: 0, offsetNode: wrapper }
        );

        click(wrapper, { clientX: 300, clientY: 70 });

        expect(caretOf(twinOf(wrapper))).toEqual({ offset: 11, text: "Second line" });
      });

      it("is put where the read-only twin was clicked when it is edited again", async () => {
        const first = await beginEdit();
        typeInto(first, "Hello there");
        pressOutside();
        await settle();
        const kept = twinOf(wrapper);
        hitBy(() => ({ offset: 4, offsetNode: kept.querySelector("p span")!.firstChild as Text }));

        click(kept);

        expect(caretOf(kept.nextElementSibling as HTMLElement)).toEqual({
          offset: 4,
          text: "Hello there",
        });
      });
    });

    describe("a click that waits for the state", () => {
      it("shows on the wrapper that the edit is starting, until it starts", async () => {
        click(wrapper);
        expect(wrapper.hasAttribute(DATA_VE_EDIT_STARTING_ATTR)).toBe(true);

        await settle();

        expect(wrapper.hasAttribute(DATA_VE_EDIT_STARTING_ATTR)).toBe(false);
        expect(twinOf(wrapper).hasAttribute(DATA_VE_EDIT_STARTING_ATTR)).toBe(false);
      });

      it("shows it until the wait ends without an edit", async () => {
        fetchApi.mockImplementationOnce(() => new Promise(() => undefined));
        click(wrapper);

        await vi.advanceTimersByTimeAsync(RICH_TEXT_STATE_TIME_LIMIT_MS - 1);
        expect(wrapper.hasAttribute(DATA_VE_EDIT_STARTING_ATTR)).toBe(true);

        await vi.advanceTimersByTimeAsync(1);
        expect(wrapper.hasAttribute(DATA_VE_EDIT_STARTING_ATTR)).toBe(false);
      });

      it("shows nothing for a click that starts the edit at once", async () => {
        await hoverUntilReady();

        click(wrapper);

        expect(wrapper.hasAttribute(DATA_VE_EDIT_STARTING_ATTR)).toBe(false);
      });
    });

    it("does for a click on the read-only twin what a click on its wrapper does, once the switch is off", async () => {
      const twin = await beginEdit();
      typeInto(twin, "Hello there");
      pressOutside();
      await settle();
      const kept = twinOf(wrapper);
      ctx = { ...ctx, inlineEditing: false };
      overlay.applyMode();

      const event = click(kept);

      expect(open).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
      expect(kept.nextElementSibling?.hasAttribute(DATA_VE_EDITING_ATTR) ?? false).toBe(false);
    });

    describe("of a wrapper that holds the rendered nodes in an element of its own", () => {
      const UPLOAD = { format: "", relationTo: "media", type: "upload", value: 3, version: 3 };

      const NESTED_STATE = stateOf(
        element("heading", [text("A heading")], { tag: "h2" }),
        paragraph(text("Hello world")),
        UPLOAD
      );

      const renderNested = (nodes: string) => {
        wrapper.className = "";
        wrapper.innerHTML = `<div class="prose max-w-full" id="prose">${nodes}</div>`;
        return wrapper.firstElementChild as HTMLElement;
      };

      const renderNestedStory = async () => {
        const prose = renderNested(
          '<h2 class="title"></h2><p class="lead"></p><figure class="media" id="figure"><img alt="Photo"></figure>'
        );
        prose.querySelector("h2")!.textContent = markedTextNode("A heading", "0.0", SHAPE);
        prose.querySelector("p")!.textContent = markedTextNode("Hello world", "1.0", SHAPE);
        storedState = NESTED_STATE;
        await settle();
        return prose;
      };

      afterEach(() => Reflect.deleteProperty(document, "caretPositionFromPoint"));

      it("edits in a copy of the chain of elements down to the one that holds the nodes", async () => {
        await renderNestedStory();
        const twin = await beginEdit();
        const content = twin.firstElementChild as HTMLElement;

        expect([twin.tagName, twin.className, twin.childElementCount]).toEqual(["SECTION", "", 1]);
        expect([content.tagName, content.className]).toEqual(["DIV", "prose max-w-full"]);
        expect(content.hasAttribute("id")).toBe(false);
        expect(content.hasAttribute(DATA_VE_PATH_ATTR)).toBe(false);
        expect(twin.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(false);
        expect(content.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
        expect(content.getAttribute("contenteditable")).toBe("true");
        expect(content.querySelectorAll(":scope > h2, :scope > p")).toHaveLength(2);
        expect(content.querySelectorAll(`:scope > [${DATA_VE_OPAQUE_ATTR}]`)).toHaveLength(1);
        expect(isShown(wrapper)).toBe(false);
      });

      it("takes the direction the site wrote on the elements of the chain", async () => {
        const prose = await renderNestedStory();
        wrapper.dir = "rtl";
        prose.dir = "rtl";
        const twin = await beginEdit();

        expect([twin.dir, (twin.firstElementChild as HTMLElement).dir]).toEqual(["rtl", "rtl"]);
      });

      it("takes the classes of the nodes and the copy of a node it cannot edit from that element", async () => {
        await renderNestedStory();
        const twin = await beginEdit();

        const placeholder = twin.querySelector(`[${DATA_VE_OPAQUE_ATTR}]`) as HTMLElement;
        expect(twin.querySelector("h2")?.className).toBe("title");
        expect(twin.querySelector("p")?.className).toBe("lead");
        expect(placeholder.firstElementChild?.tagName).toBe("FIGURE");
        expect(placeholder.firstElementChild?.className).toBe("media");
        expect(placeholder.querySelector("img")?.getAttribute("alt")).toBe("Photo");
        expect(placeholder.querySelector("[id]")).toBeNull();
      });

      it("puts the caret where the click hit the text inside that element", async () => {
        const prose = await renderNestedStory();
        await hoverUntilReady();
        hitBy(() => ({ offset: 5, offsetNode: prose.querySelector("p")!.firstChild as Text }));

        click(wrapper);

        expect(caretOf(twinOf(wrapper).firstElementChild!)).toEqual({
          offset: 5,
          text: "Hello world",
        });
      });

      it("leaves the page as it was rendered after Escape", async () => {
        await renderNestedStory();
        const rendered = main.innerHTML;
        const twin = await beginEdit();

        press(twin.firstElementChild!, "Escape");

        expect(main.innerHTML).toBe(rendered);
      });

      it("keeps the chain in the read-only twin and edits it again in a copy of the same chain", async () => {
        await renderNestedStory();
        const twin = await beginEdit();
        typeInto(twin.firstElementChild!, "Another heading");
        pressOutside();
        await settle();
        const kept = twinOf(wrapper);
        const keptContent = kept.firstElementChild as HTMLElement;

        expect(kept.hasAttribute(DATA_VE_EDITED_ATTR)).toBe(true);
        expect(keptContent.className).toBe("prose max-w-full");
        expect(keptContent.hasAttribute("contenteditable")).toBe(false);
        expect(keptContent.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(false);
        expect(keptContent.querySelector("figure.media")).not.toBeNull();
        expect([...keptContent.children].map(({ tagName }) => tagName)).toEqual(["H2", "P", "DIV"]);

        click(kept);
        const second = kept.nextElementSibling as HTMLElement;

        expect(second.firstElementChild?.className).toBe("prose max-w-full");
        expect(second.querySelector("h2")?.className).toBe("title");
        expect(second.querySelector("figure.media")).not.toBeNull();
        expect(isShown(kept)).toBe(false);
      });

      it("finds that element for a rich text of one paragraph", async () => {
        const prose = renderNested('<p class="lead"></p>');
        prose.querySelector("p")!.textContent = markedTextNode("Hello world", "0.0", SHAPE);
        storedState = stateOf(paragraph(text("Hello world")));
        await settle();

        const twin = await beginEdit();

        expect(twin.firstElementChild?.className).toBe("prose max-w-full");
        expect(twin.querySelector(".prose > p")?.className).toBe("lead");
      });

      it("edits in a twin of the wrapper alone when its one element is a rendered node", async () => {
        const twin = await beginEdit();

        expect(twin.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
        expect(twin.firstElementChild?.tagName).toBe("P");
      });
    });

    it("asks again on a pointer move once the state it held was used", async () => {
      const twin = await beginEdit();
      press(twin, "Escape");

      await vi.advanceTimersByTimeAsync(RICH_TEXT_CHECK_PAUSE_MS);
      movePointerOver(wrapper);
      await settle();

      expect(requestsTo(VE_RICH_TEXT_VALUE_PATH)).toHaveLength(2);
    });

    it("edits a second wrapper of the same field from the state the first one asked for", async () => {
      const second = renderRichText();
      await settle();
      await hoverUntilReady();

      click(second);

      expect(twinOf(second).hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
      expect(requestsTo(VE_RICH_TEXT_VALUE_PATH)).toHaveLength(1);
    });

    it("ends the edit and removes the twin when the site replaces the wrapper", async () => {
      const twin = await beginEdit();
      typeInto(twin, "Hello there");

      wrapper.remove();
      const replaced = renderRichText();
      await settle();

      expect(twin.isConnected).toBe(false);
      expect(main.querySelector(`[${DATA_VE_EDITING_ATTR}]`)).toBeNull();
      expect(main.querySelector(`[${DATA_VE_EDITED_ATTR}]`)).toBeNull();
      expect(isShown(replaced)).toBe(true);
      expect(requestsTo(VE_FIELD_EDIT_PATH)).toHaveLength(1);
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

    it("saves what was typed after a pause, while the edit runs", async () => {
      const twin = await beginEdit();

      typeInto(twin, "Hello there");
      expect(statusLabel()).toBe("Unsaved changes");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      expect(requestsTo(VE_FIELD_EDIT_PATH)).toHaveLength(1);
      expect(statusLabel()).toBe("Saved");
      expect(twin.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
    });

    it("saves the state the editor typed once, when the edit is committed, with every other node as it was", async () => {
      const twin = await beginEdit();
      typeInto(twin, "Hello");
      typeInto(twin, "Hello there");

      pressOutside();
      await settle();

      expect(requestsTo(VE_FIELD_EDIT_PATH)).toEqual([
        { ...BODY, base: STATE, state: stateOf(paragraph(text("Hello there")), CALLOUT) },
      ]);
      expect(onEdited).toHaveBeenCalledTimes(1);
    });

    it("ends the edit and saves it when the tab is hidden", async () => {
      const twin = await beginEdit();
      typeInto(twin, "Hello there");
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");

      document.dispatchEvent(new Event("visibilitychange"));
      await settle();

      expect(twin.isConnected).toBe(false);
      expect(twinOf(wrapper).hasAttribute(DATA_VE_EDITED_ATTR)).toBe(true);
      expect(requestsTo(VE_FIELD_EDIT_PATH)).toHaveLength(1);
    });

    it("saves the last state at once when the page is left while an earlier save is on the way", async () => {
      const twin = await beginEdit();
      fetchApi.mockImplementationOnce(() => new Promise(() => undefined));
      typeInto(twin, "Hello there");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);
      typeInto(twin, "Hello again");

      window.dispatchEvent(new Event("pagehide"));
      await settle();

      expect(requestsTo(VE_FIELD_EDIT_PATH)).toEqual([
        { ...BODY, base: STATE, state: stateOf(paragraph(text("Hello there")), CALLOUT) },
        {
          ...BODY,
          base: STATE,
          sentBefore: stateOf(paragraph(text("Hello there")), CALLOUT),
          state: stateOf(paragraph(text("Hello again")), CALLOUT),
        },
      ]);
    });

    it("ends the edit and keeps what was saved when the editor fails during the edit", async () => {
      const twin = await beginEdit();
      typeInto(twin, "Hello there");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      lexicalOf(twin).update(
        () => {
          throw new Error("broken");
        },
        { discrete: true }
      );
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      expect(twin.isConnected).toBe(false);
      expect(requestsTo(VE_FIELD_EDIT_PATH)).toEqual([
        { ...BODY, base: STATE, state: stateOf(paragraph(text("Hello there")), CALLOUT) },
      ]);
    });

    describe("with a node the page cannot edit", () => {
      const removeTheBlock = (twin: HTMLElement) => {
        selectTheBlock(twin);
        pressBackspace(twin);
      };

      it("saves the state without it after it was selected and removed", async () => {
        const twin = await beginEdit();

        removeTheBlock(twin);
        expect(twin.querySelector(`[${DATA_VE_OPAQUE_ATTR}]`)).toBeNull();
        expect(requestsTo(VE_FIELD_EDIT_PATH)).toEqual([]);
        pressOutside();
        await settle();

        expect(requestsTo(VE_FIELD_EDIT_PATH)).toEqual([
          { ...BODY, base: STATE, state: stateOf(paragraph(text("Hello world"))) },
        ]);
      });

      it("saves it as it was shown when the removal was undone", async () => {
        const twin = await beginEdit();
        removeTheBlock(twin);

        lexicalOf(twin).update(() => lexicalOf(twin).dispatchCommand(UNDO_COMMAND, undefined), {
          discrete: true,
        });
        pressOutside();
        await settle();

        expect(requestsTo(VE_FIELD_EDIT_PATH)).toEqual([{ ...BODY, base: STATE, state: STATE }]);
      });

      it("saves nothing and shows the wrapper when Escape follows the removal", async () => {
        const twin = await beginEdit();
        removeTheBlock(twin);

        press(twin, "Escape");
        await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

        expect(requestsTo(VE_FIELD_EDIT_PATH)).toEqual([]);
        expect(isShown(wrapper)).toBe(true);
        expect(twinOf(wrapper)).toBeNull();
        expect(statusLabel()).not.toBe("Unsaved changes");
      });
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

    it("saves nothing on Escape after something was typed", async () => {
      const twin = await beginEdit();
      typeInto(twin, "Hello there");

      press(twin, "Escape");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      expect(requestsTo(VE_FIELD_EDIT_PATH)).toEqual([]);
      expect(isShown(wrapper)).toBe(true);
      expect(statusLabel()).not.toBe("Unsaved changes");
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
      expect(second.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
      expect(isShown(kept)).toBe(false);
      pressOutside();
      await settle();

      expect(requestsTo(VE_FIELD_EDIT_PATH).at(-1)).toEqual({
        ...BODY,
        base: stateOf(paragraph(text("Hello there")), CALLOUT),
        state: stateOf(paragraph(text("Hello again")), CALLOUT),
      });
    });

    it("asks for the state again when the edit begins from a state it held too long", async () => {
      await hoverUntilReady();
      storedState = stateOf(paragraph(text("Changed in the admin")));
      await vi.advanceTimersByTimeAsync(RICH_TEXT_STATE_FRESH_MS);

      click(wrapper);
      await settle();

      expect(requestsTo(VE_RICH_TEXT_VALUE_PATH)).toHaveLength(2);
      expect(twinOf(wrapper).textContent).toBe("Changed in the admin");
    });

    it("begins at once from a state it was given a moment ago", async () => {
      await hoverUntilReady();
      await vi.advanceTimersByTimeAsync(RICH_TEXT_STATE_FRESH_MS - 1);

      click(wrapper);

      expect(twinOf(wrapper).hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
      expect(requestsTo(VE_RICH_TEXT_VALUE_PATH)).toHaveLength(1);
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

      click(wrapper);
      await settle();
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
      postFromAdmin({ ...BODY, formats: FORMATS, state: STATE, type: VE_RICH_TEXT_STATE_TYPE });

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

    it("takes the click, and opens the field in the form when the state is refused", async () => {
      const event = click(wrapper);
      await settle();
      expect(event.defaultPrevented).toBe(true);
      expect(messagesOfType(postToAdmin, VE_MESSAGE_TYPE)).toEqual([]);

      postFromAdmin({ ...BODY, type: VE_RICH_TEXT_STATE_REFUSED_TYPE });

      expect(twinOf(wrapper)?.hasAttribute(DATA_VE_EDITING_ATTR) ?? false).toBe(false);
      expect(messagesOfType(postToAdmin, VE_MESSAGE_TYPE)).toHaveLength(1);
    });

    it("starts the edit of a click that waited once the form answers", async () => {
      click(wrapper);
      await settle();

      answerState();

      expect(twinOf(wrapper).hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
    });

    it("opens the field in the form when the form does not answer in time", async () => {
      click(wrapper);

      await vi.advanceTimersByTimeAsync(RICH_TEXT_STATE_TIME_LIMIT_MS);

      expect(messagesOfType(postToAdmin, VE_MESSAGE_TYPE)).toHaveLength(1);
    });

    it("ignores a state from a window that is not the admin", async () => {
      await hoverUntilReady();
      postFromAdmin(
        { ...BODY, formats: FORMATS, state: STATE, type: VE_RICH_TEXT_STATE_TYPE },
        { source: {} }
      );

      click(wrapper);

      expect(twinOf(wrapper)?.hasAttribute(DATA_VE_EDITING_ATTR) ?? false).toBe(false);
    });

    it.each([
      [
        "a structure of the field",
        { ...BODY, shape: "s", state: null, type: VE_RICH_TEXT_STRUCTURE_TYPE },
      ],
      [
        "a patch of its document",
        { ...PAGE, locale: "en", patches: [], type: VE_FIELD_PATCH_TYPE },
      ],
      ["a save of its document", { ...PAGE, locale: "en", type: VE_DOCUMENT_SAVED_TYPE }],
      ["a save that names no document", { type: VE_DOCUMENT_SAVED_TYPE }],
    ])(
      "forgets the state it holds when the admin tells of %s, and asks again",
      async (_name, news) => {
        await hoverUntilReady();
        answerState();

        postFromAdmin(news);
        await vi.advanceTimersByTimeAsync(RICH_TEXT_CHECK_PAUSE_MS);
        movePointerOver(wrapper);

        expect(messagesOfType(postToAdmin, VE_RICH_TEXT_STATE_REQUEST_TYPE)).toHaveLength(2);
        click(wrapper);
        expect(twinOf(wrapper)?.hasAttribute(DATA_VE_EDITING_ATTR) ?? false).toBe(false);
      }
    );

    it("keeps the state it holds when the admin tells of another document", async () => {
      await hoverUntilReady();
      answerState();

      postFromAdmin({ ...PAGE, docId: "2", locale: "en", type: VE_DOCUMENT_SAVED_TYPE });
      click(wrapper);

      expect(twinOf(wrapper).hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
    });

    it("keeps an unsaved edit of the field as it is when a later request for its state is refused", async () => {
      await hoverUntilReady();
      answerState();
      click(wrapper);
      typeInto(twinOf(wrapper), "Hello there");
      pressOutside();
      expect(statusLabel()).toBe("Unsaved changes");

      postFromAdmin({ ...BODY, type: VE_RICH_TEXT_STATE_REFUSED_TYPE });

      expect(statusLabel()).toBe("Unsaved changes");
    });

    it("edits once the state arrived and leaves the form where it is, so the frame of the page never moves", async () => {
      await hoverUntilReady();
      answerState();

      click(wrapper);

      expect(twinOf(wrapper).hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
      expect(messagesOfType(postToAdmin, VE_MESSAGE_TYPE)).toEqual([]);
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

    describe("with a node the page cannot edit", () => {
      const ENDED = { ...BODY, type: VE_RICH_TEXT_EDIT_ENDED_TYPE };

      const typesPosted = () =>
        postToAdmin.mock.calls
          .map(([message]) => (message as { type: string }).type)
          .filter(
            (type) => type === VE_RICH_TEXT_EDIT_TYPE || type === VE_RICH_TEXT_EDIT_ENDED_TYPE
          );

      const statesPosted = () =>
        messagesOfType(postToAdmin, VE_RICH_TEXT_EDIT_TYPE).map(
          (message) => (message as unknown as { state: unknown }).state
        );

      const beginNextToTheAdmin = async () => {
        await hoverUntilReady();
        answerState();
        click(wrapper);
        return twinOf(wrapper);
      };

      it("posts the state without it while the edit runs, and with it again after an undo", async () => {
        const twin = await beginNextToTheAdmin();

        selectTheBlock(twin);
        pressBackspace(twin);
        await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);
        lexicalOf(twin).update(() => lexicalOf(twin).dispatchCommand(UNDO_COMMAND, undefined), {
          discrete: true,
        });
        await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);

        expect(statesPosted()).toEqual([stateOf(paragraph(text("Hello world"))), STATE]);
        expect(messagesOfType(postToAdmin, VE_RICH_TEXT_EDIT_ENDED_TYPE)).toEqual([]);
      });

      it("tells the admin that the edit ended after the last state of a commit", async () => {
        const twin = await beginNextToTheAdmin();
        typeInto(twin, "Hello there");

        pressOutside();

        expect(typesPosted()).toEqual([VE_RICH_TEXT_EDIT_TYPE, VE_RICH_TEXT_EDIT_ENDED_TYPE]);
        expect(messagesOfType(postToAdmin, VE_RICH_TEXT_EDIT_ENDED_TYPE)).toEqual([ENDED]);
      });

      it("posts the state the edit began with on Escape, and then that the edit ended", async () => {
        const twin = await beginNextToTheAdmin();
        selectTheBlock(twin);
        pressBackspace(twin);
        await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);

        press(twin, "Escape");

        expect(statesPosted()).toEqual([stateOf(paragraph(text("Hello world"))), STATE]);
        expect(typesPosted().at(-1)).toBe(VE_RICH_TEXT_EDIT_ENDED_TYPE);
      });

      it("tells the admin that an edit without a change ended", async () => {
        await beginNextToTheAdmin();

        pressOutside();

        expect(typesPosted()).toEqual([VE_RICH_TEXT_EDIT_ENDED_TYPE]);
      });

      it("asks for no state of the field while it is edited, so the admin keeps what the edit began with", async () => {
        const second = renderRichText();
        await settle();
        await beginNextToTheAdmin();

        await vi.advanceTimersByTimeAsync(RICH_TEXT_CHECK_PAUSE_MS);
        movePointerOver(second);

        expect(messagesOfType(postToAdmin, VE_RICH_TEXT_STATE_REQUEST_TYPE)).toHaveLength(1);
      });
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

    it("says why the form refused an edit", async () => {
      await hoverUntilReady();
      answerState();
      click(wrapper);
      typeInto(twinOf(wrapper), "Hello there");
      await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);

      postFromAdmin({ ...BODY, reason: "not-editable", type: VE_FIELD_EDIT_REFUSED_TYPE });

      expect(statusLabel()).toBe("This field cannot be edited here");
    });
  });
});
