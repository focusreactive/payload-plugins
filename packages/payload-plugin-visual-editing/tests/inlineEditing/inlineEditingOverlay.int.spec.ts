import type { MockInstance } from "vitest";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Overlay, OverlayCtx } from "../../src/client/createOverlay";

import { createOverlay } from "../../src/client/createOverlay";
import { EDIT_SAVE_PAUSE_MS } from "../../src/client/inlineEditing/editTransport";
import { DATA_VE_SAVE_STATUS_ATTR } from "../../src/client/inlineEditing/saveStatus";
import { DATA_VE_EDITING_ATTR } from "../../src/client/inlineEditing/textEditing";
import {
  VE_DOCUMENT_SAVED_TYPE,
  VE_FIELD_EDIT_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_MESSAGE_TYPE,
} from "../../src/shared/protocol";

import { markedText, markedTextNode } from "../support/markedData";
import { click, overlayCtx } from "../support/overlay";
import { postFromAdmin, restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";

const PAYLOAD_API = "https://cms.example.com/api";

const PAGE = { collectionSlug: "page", docId: "1", kind: "collection" } as const;

const stega = (visible: string, path = "title", document: object = PAGE) =>
  markedText(visible, { ...PAGE, ...document, path });

const statusLabel = () =>
  document.querySelector(`[${DATA_VE_SAVE_STATUS_ATTR}]`)?.shadowRoot?.querySelector("span")
    ?.textContent;

const messagesOfType = (post: ReturnType<typeof vi.fn>, type: string) =>
  post.mock.calls.map(([message]) => message as { type: string }).filter((m) => m.type === type);

const type = (element: HTMLElement, text: string) => {
  (element.firstChild as Text).data = text;
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

const press = (element: HTMLElement, key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, ...init });
  element.dispatchEvent(event);
  return event;
};

const flushMutations = () => vi.advanceTimersByTimeAsync(0);

const pause = () => vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

describe("editing text on the page", () => {
  let main: HTMLElement;
  let heading: HTMLElement;
  let overlay: Overlay;
  let ctx: OverlayCtx;
  let fetchEndpoint: ReturnType<typeof vi.fn>;
  let open: MockInstance<typeof window.open>;

  const render = (text: string, tag = "p") => {
    const element = document.createElement(tag);
    element.textContent = text;
    main.append(element);
    return element;
  };

  const start = (overrides: Partial<OverlayCtx> = {}) => {
    ctx = overlayCtx({
      inlineEditing: true,
      instantPreview: true,
      locale: "en",
      mode: "hover",
      payloadApi: PAYLOAD_API,
      ...overrides,
    });
    overlay = createOverlay(main, () => ctx);
  };

  const sentToEndpoint = () =>
    fetchEndpoint.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    main = document.createElement("main");
    document.body.append(main);
    heading = render(stega("Hello"), "h1");
    fetchEndpoint = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ saved: true }), ok: true } as Response)
    );
    vi.stubGlobal("fetch", fetchEndpoint);
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

    it("lets the editor type into the text a click lands on", () => {
      const event = click(heading);

      expect(heading.getAttribute("contenteditable")).toBe("plaintext-only");
      expect(heading.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
      expect(heading.getAttribute("spellcheck")).toBe("false");
      expect(event.defaultPrevented).toBe(true);
      expect(open).not.toHaveBeenCalled();
    });

    it("saves what the editor typed once the typing pauses", async () => {
      click(heading);
      type(heading, "Hello w");
      type(heading, "Hello world");

      await pause();

      expect(sentToEndpoint()).toEqual([
        { ...PAGE, key: "title", locale: "en", value: "Hello world" },
      ]);
      expect(heading.textContent).toBe("Hello world");
    });

    it("saves at once when the page is left before the pause ends", async () => {
      click(heading);
      type(heading, "Hello world");

      window.dispatchEvent(new Event("pagehide"));
      await flushMutations();

      expect(sentToEndpoint()).toHaveLength(1);
    });

    it("saves at once when the tab is hidden, and not when it is shown", async () => {
      const visibility = vi.spyOn(document, "visibilityState", "get");
      click(heading);
      type(heading, "Hello world");

      visibility.mockReturnValue("visible");
      document.dispatchEvent(new Event("visibilitychange"));
      await flushMutations();
      expect(sentToEndpoint()).toHaveLength(0);

      visibility.mockReturnValue("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
      await flushMutations();
      visibility.mockRestore();

      expect(sentToEndpoint()).toHaveLength(1);
    });

    it("stops watching the page being left when the overlay stops", async () => {
      overlay.dispose();
      const removed = vi.spyOn(window, "removeEventListener");
      start();

      overlay.dispose();

      expect(removed.mock.calls.map(([name]) => name)).toContain("pagehide");
      removed.mockRestore();
      start();
    });

    it("ends the edit and saves at once on Enter", async () => {
      click(heading);
      type(heading, "Hello world");

      const enter = press(heading, "Enter");
      await flushMutations();

      expect(enter.defaultPrevented).toBe(true);
      expect(heading.hasAttribute("contenteditable")).toBe(false);
      expect(heading.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(false);
      expect(heading.hasAttribute("spellcheck")).toBe(false);
      expect(sentToEndpoint()).toHaveLength(1);
    });

    it("leaves a line break to the page on Shift and Enter", () => {
      click(heading);

      const enter = press(heading, "Enter", { shiftKey: true });

      expect(enter.defaultPrevented).toBe(false);
      expect(heading.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
    });

    it("ends the edit when the text loses the focus", async () => {
      click(heading);
      type(heading, "Hello world");

      heading.dispatchEvent(new FocusEvent("blur"));
      await flushMutations();

      expect(heading.hasAttribute("contenteditable")).toBe(false);
      expect(sentToEndpoint()).toHaveLength(1);
    });

    it("shows the text the edit began with on Escape and saves nothing", async () => {
      click(heading);
      type(heading, "Changed");

      press(heading, "Escape");
      await pause();

      expect(heading.textContent).toBe("Hello");
      expect(heading.hasAttribute("contenteditable")).toBe(false);
      expect(sentToEndpoint().at(-1)).toMatchObject({ value: "Hello" });
    });

    it("sends nothing on Escape when the editor typed nothing", async () => {
      click(heading);

      press(heading, "Escape");
      await pause();

      expect(fetchEndpoint).not.toHaveBeenCalled();
    });

    it("keeps a click inside the text it edits to the browser", () => {
      click(heading);

      const second = click(heading, { detail: 2 });

      expect(second.defaultPrevented).toBe(true);
      expect(heading.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
      expect(open).not.toHaveBeenCalled();
    });

    it("ends one edit when the editor clicks another text", async () => {
      const lead = render(stega("Lead", "lead"));
      await flushMutations();
      click(heading);
      type(heading, "Hello world");

      click(lead);
      await flushMutations();

      expect(heading.hasAttribute("contenteditable")).toBe(false);
      expect(lead.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
      expect(sentToEndpoint()).toEqual([expect.objectContaining({ key: "title" })]);
    });

    it("edits the label of a link without following it", () => {
      const link = document.createElement("a");
      link.href = "#pricing";
      link.textContent = stega("Pricing", "cta");
      main.append(link);
      overlay.dispose();
      start();

      const event = click(link);

      expect(event.defaultPrevented).toBe(true);
      expect(link.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
    });

    it("says how the save went", async () => {
      click(heading);
      type(heading, "Hello world");
      expect(statusLabel()).toBe("Unsaved changes");

      await pause();

      expect(statusLabel()).toBe("Saved");
    });

    it("leaves Enter to the input method while it composes a character", () => {
      click(heading);

      const enter = press(heading, "Enter", { isComposing: true });

      expect(enter.defaultPrevented).toBe(false);
      expect(heading.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
    });

    it("ends the edit of a text the page removed", async () => {
      click(heading);
      type(heading, "Hello world");

      heading.remove();
      await flushMutations();
      await pause();

      expect(sentToEndpoint()).toEqual([expect.objectContaining({ value: "Hello world" })]);
      const lead = render(stega("Lead", "lead"));
      await flushMutations();
      click(lead);
      expect(lead.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
    });

    it("says when the save failed", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve({ ok: false } as Response));
      click(heading);
      type(heading, "Hello world");

      await pause();

      expect(statusLabel()).toBe("Not saved");
    });

    it("opens the form for text that shares its element with other text", async () => {
      const mixed = document.createElement("p");
      mixed.append("Intro: ", stega("Body", "body"));
      main.append(mixed);
      await flushMutations();

      click(mixed);

      expect(mixed.hasAttribute("contenteditable")).toBe(false);
      expect(open).toHaveBeenCalledTimes(1);
    });

    it("opens the form for text of every locale at once", async () => {
      const localized = render(markedText("Hallo", { ...PAGE, locale: "de", path: "title" }));
      await flushMutations();

      click(localized);

      expect(localized.hasAttribute("contenteditable")).toBe(false);
      expect(open).toHaveBeenCalledTimes(1);
    });

    it("opens the form for a text node of a rich text", async () => {
      const wrapper = document.createElement("div");
      wrapper.dataset.vePath = "content";
      wrapper.dataset.veCollection = "page";
      wrapper.dataset.veDocId = "1";
      const paragraph = document.createElement("p");
      paragraph.textContent = markedTextNode("Rich", "0.0", "abc123");
      wrapper.append(paragraph);
      main.append(wrapper);
      await flushMutations();

      click(paragraph);

      expect(paragraph.hasAttribute("contenteditable")).toBe(false);
      expect(open).toHaveBeenCalledTimes(1);
    });

    it("ends the edit when the editor turns editing on the page off", async () => {
      click(heading);
      type(heading, "Hello world");

      ctx = { ...ctx, inlineEditing: false };
      overlay.applyMode();
      await flushMutations();

      expect(heading.hasAttribute("contenteditable")).toBe(false);
      expect(sentToEndpoint()).toHaveLength(1);
    });

    it("restores the page when the overlay stops in the middle of an edit", () => {
      click(heading);
      type(heading, "Hello world");

      overlay.dispose();

      expect(heading.hasAttribute("contenteditable")).toBe(false);
      expect(document.querySelector(`[${DATA_VE_SAVE_STATUS_ATTR}]`)).toBeNull();
      start();
    });
  });

  describe("while editing on the page is off", () => {
    it("opens the field in the admin, as before", () => {
      start({ inlineEditing: false });

      click(heading);

      expect(heading.hasAttribute("contenteditable")).toBe(false);
      expect(open).toHaveBeenCalledTimes(1);
    });
  });

  describe("on a page next to the admin", () => {
    const postToAdmin = vi.fn();

    const snapshot = (value: string) => ({
      ...PAGE,
      fields: [{ key: "title", saved: value, value }],
      locale: "en",
      type: VE_FIELD_SNAPSHOT_TYPE,
    });

    beforeEach(() => {
      postToAdmin.mockClear();
      stubAdminWindow({ postMessage: postToAdmin });
      start();
    });

    it("opens the form for a field the admin holds no form of", () => {
      click(heading);

      expect(heading.hasAttribute("contenteditable")).toBe(false);
      expect(messagesOfType(postToAdmin, VE_MESSAGE_TYPE)).toHaveLength(1);
    });

    it("posts what the editor typed to the form of the admin", async () => {
      postFromAdmin(snapshot("Hello"));
      click(heading);
      type(heading, "Hello world");

      await pause();

      expect(messagesOfType(postToAdmin, VE_FIELD_EDIT_TYPE)).toEqual([
        { ...PAGE, key: "title", locale: "en", type: VE_FIELD_EDIT_TYPE, value: "Hello world" },
      ]);
      expect(messagesOfType(postToAdmin, VE_MESSAGE_TYPE)).toEqual([
        {
          ...PAGE,
          focus: false,
          key: undefined,
          locale: "en",
          path: "title",
          type: VE_MESSAGE_TYPE,
        },
      ]);
      expect(fetchEndpoint).not.toHaveBeenCalled();
    });

    it("keeps the typed text when the form answers with an older value", async () => {
      postFromAdmin(snapshot("Hello"));
      click(heading);
      type(heading, "Hello world");

      postFromAdmin({
        ...PAGE,
        locale: "en",
        patches: [{ key: "title", value: "Hello wor" }],
        type: "ve:field-patch",
      });
      await flushMutations();

      expect(heading.textContent).toBe("Hello world");
    });

    it("follows the form again once the edit ended", async () => {
      postFromAdmin(snapshot("Hello"));
      click(heading);
      type(heading, "Hello world");
      await flushMutations();
      press(heading, "Enter");
      postFromAdmin({
        ...PAGE,
        locale: "en",
        patches: [{ key: "title", value: "Hello world" }],
        type: "ve:field-patch",
      });
      await flushMutations();

      postFromAdmin({
        ...PAGE,
        locale: "en",
        patches: [{ key: "title", value: "Typed in the form" }],
        type: "ve:field-patch",
      });
      await flushMutations();

      expect(heading.textContent).toBe("Typed in the form");
    });

    it("says the edit is not saved when the form did not take it", async () => {
      postFromAdmin(snapshot("Hello"));
      click(heading);
      type(heading, "Hello world");
      await pause();

      postFromAdmin({ ...PAGE, key: "title", locale: "en", type: "ve:field-edit-refused" });

      expect(statusLabel()).toBe("Not saved");
    });

    it("says the edit is saved when the admin saved the document", async () => {
      postFromAdmin(snapshot("Hello"));
      click(heading);
      type(heading, "Hello world");
      await pause();
      expect(statusLabel()).toBe("Unsaved changes");

      postFromAdmin({ ...PAGE, locale: "en", type: VE_DOCUMENT_SAVED_TYPE });

      expect(statusLabel()).toBe("Saved");
    });
  });
});
