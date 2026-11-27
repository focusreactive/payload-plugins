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
import {
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
  stubOpenerWindow,
} from "../support/previewWindow";

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

const textIn = (element: Element) =>
  Array.from(element.childNodes).find(
    (node): node is Text => node instanceof Text && node.data.trim() !== ""
  ) as Text;

const typeInto = (element: HTMLElement, text: string) => {
  textIn(element).data = text;
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

const press = (element: HTMLElement, key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, ...init });
  element.dispatchEvent(event);
  return event;
};

const paste = (element: HTMLElement, text: string) => {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: { getData: (format: string) => (format === "text/plain" ? text : "") },
  });
  element.dispatchEvent(event);
  return event;
};

const inputBefore = (element: HTMLElement, init: InputEventInit) => {
  const event = new InputEvent("beforeinput", { bubbles: true, cancelable: true, ...init });
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

      expect(heading.getAttribute("contenteditable")).toBe("true");
      expect(heading.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
      expect(heading.getAttribute("spellcheck")).toBe("false");
      expect(event.defaultPrevented).toBe(true);
      expect(open).not.toHaveBeenCalled();
    });

    it("edits a line of text on a click anywhere in the block it fills", () => {
      const block = document.createElement("h2");
      const line = document.createElement("span");
      line.style.display = "inline";
      line.textContent = stega("Title", "subtitle");
      block.append(line);
      main.append(block);
      overlay.dispose();
      start();

      const event = click(block);

      expect(line.getAttribute("contenteditable")).toBe("true");
      expect(event.defaultPrevented).toBe(true);
    });

    it("leaves a click beside the text of a button to the page, and edits on a click on the text", () => {
      const control = document.createElement("button");
      const label = document.createElement("span");
      const icon = document.createElement("i");
      label.textContent = stega("Question", "question");
      control.append(label, icon);
      main.append(control);
      overlay.dispose();
      start();

      const beside = click(icon);

      expect(beside.defaultPrevented).toBe(false);
      expect(label.hasAttribute("contenteditable")).toBe(false);
      expect(open).not.toHaveBeenCalled();

      const onTheText = click(label);

      expect(onTheText.defaultPrevented).toBe(true);
      expect(label.getAttribute("contenteditable")).toBe("true");
    });

    describe("beside an icon the editor cannot change", () => {
      let line: HTMLElement;
      let icon: SVGSVGElement;

      const showLine = (text: string, marker: object = {}) => {
        line = document.createElement("h2");
        icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("contenteditable", "false");
        line.append(icon, stega(text, "line", marker));
        main.append(line);
        overlay.dispose();
        start();
        click(line);
      };

      const deleteBack = (inputType: string, from: number, to: number) => {
        const lineText = textIn(line);
        document.getSelection()?.collapse(lineText, to);
        const reach = document.createRange();
        reach.setStart(lineText, from);
        reach.setEnd(lineText, to);
        const event = new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType,
        });
        Object.defineProperty(event, "getTargetRanges", { value: () => [reach] });
        line.dispatchEvent(event);
        return event;
      };

      it("leaves deleting a word inside the text to the browser", () => {
        showLine("Hero foo.bar here");
        const lineText = textIn(line);
        const end = lineText.data.indexOf("bar") + "bar".length;

        const event = deleteBack("deleteWordBackward", end - "bar".length, end);

        expect(event.defaultPrevented).toBe(false);
        expect(lineText.data).toContain("Hero foo.bar here");
      });

      it.each(["deleteWordBackward", "deleteSoftLineBackward"])(
        "keeps the icon when %s reaches the start of the text",
        async (inputType) => {
          showLine("Hero title");
          const lineText = textIn(line);
          const hero = lineText.data.indexOf("Hero");

          const event = deleteBack(inputType, hero, hero + "Hero ".length);
          press(line, "Enter");
          await flushMutations();

          expect(event.defaultPrevented).toBe(true);
          expect(Array.from(line.childNodes)).toEqual([icon, lineText]);
          expect(sentToEndpoint().map(({ value }) => value)).toEqual(["title"]);
        }
      );

      it("stops deleting a line at the line break of a text of several lines", () => {
        showLine("First line\nSecond line", { multiline: true });
        const lineText = textIn(line);
        const second = lineText.data.indexOf("Second");

        const event = deleteBack("deleteHardLineBackward", second, second + "Second".length);

        expect(event.defaultPrevented).toBe(false);
        expect(press(line, "Backspace", { metaKey: true }).defaultPrevented).toBe(false);
      });
    });

    describe("in a line that holds other elements", () => {
      let line: HTMLElement;
      let tag: HTMLElement;
      let icon: HTMLImageElement;

      beforeEach(() => {
        line = document.createElement("div");
        tag = document.createElement("span");
        icon = document.createElement("img");
        tag.append(icon, stega("SCALE EASILY", "tag"));
        line.append(`\n  ${stega("OUR FIRST RELEASE", "line")} `, tag);
        main.append(line);
        overlay.dispose();
        start();
      });

      it("edits the text of a line and the tag inside it apart, each in its own field", async () => {
        const lineText = textIn(line);
        const tagText = textIn(tag);

        const onTheLine = click(line);
        typeInto(line, "OUR NEXT RELEASE");
        press(line, "Enter");
        click(tag);
        typeInto(tag, "SCALE FAST");
        press(tag, "Enter");
        await flushMutations();

        expect(onTheLine.defaultPrevented).toBe(true);
        expect(Array.from(line.childNodes)).toEqual([lineText, tag]);
        expect(Array.from(tag.childNodes)).toEqual([icon, tagText]);
        expect(line.textContent).toBe("\n  OUR NEXT RELEASE SCALE FAST");
        expect(sentToEndpoint().map(({ base, key, value }) => [key, base, value])).toEqual([
          ["line", "OUR FIRST RELEASE", "OUR NEXT RELEASE"],
          ["tag", "SCALE EASILY", "SCALE FAST"],
        ]);
        expect(open).not.toHaveBeenCalled();
      });

      it("makes the line editable and keeps the elements beside its text out of the edit", () => {
        click(line);

        expect(line.getAttribute("contenteditable")).toBe("true");
        expect(tag.getAttribute("contenteditable")).toBe("false");

        press(line, "Escape");

        expect(line.hasAttribute("contenteditable")).toBe(false);
        expect(tag.hasAttribute("contenteditable")).toBe(false);
      });

      it("keeps a deletion that would reach into the elements beside the text from happening", () => {
        click(line);
        const reach = document.createRange();
        reach.setStart(textIn(line), 0);
        reach.setEnd(tag, 1);
        const event = new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "deleteContentForward",
        });
        Object.defineProperty(event, "getTargetRanges", { value: () => [reach] });

        line.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
      });

      it("lets a deletion within the text happen", () => {
        click(line);
        const reach = document.createRange();
        reach.setStart(textIn(line), 4);
        reach.setEnd(textIn(line), 5);
        const event = new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "deleteContentBackward",
        });
        Object.defineProperty(event, "getTargetRanges", { value: () => [reach] });

        line.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
      });

      describe("when the browser gives no range of what an input would change", () => {
        const withoutTargetRanges = (inputType: string) => {
          const event = new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType,
          });
          Object.defineProperty(event, "getTargetRanges", { value: () => [] });
          line.dispatchEvent(event);
          return event;
        };

        const putCaretAt = (offset: number) => {
          click(line);
          document.getSelection()?.collapse(textIn(line), offset);
        };

        const startOfTheText = () => textIn(line).data.indexOf("OUR");

        const endOfTheText = () => textIn(line).data.indexOf("RELEASE") + "RELEASE".length;

        it.each([
          "deleteContentBackward",
          "deleteWordBackward",
          "deleteSoftLineBackward",
          "deleteHardLineBackward",
        ])("keeps %s at the start of the text from deleting the element before it", (inputType) => {
          putCaretAt(startOfTheText());

          expect(withoutTargetRanges(inputType).defaultPrevented).toBe(true);
        });

        it.each([
          "deleteContentForward",
          "deleteWordForward",
          "deleteSoftLineForward",
          "deleteHardLineForward",
        ])("keeps %s at the end of the text from deleting the element after it", (inputType) => {
          putCaretAt(endOfTheText());

          expect(withoutTargetRanges(inputType).defaultPrevented).toBe(true);
        });

        it("keeps Backspace at the start and Delete at the end of the text to the text", () => {
          putCaretAt(startOfTheText());
          const backspace = press(line, "Backspace");
          putCaretAt(endOfTheText());
          const forwardDelete = press(line, "Delete");

          expect([backspace.defaultPrevented, forwardDelete.defaultPrevented]).toEqual([
            true,
            true,
          ]);
        });

        it("lets Backspace and Delete in the middle of the text happen", () => {
          putCaretAt(startOfTheText() + 3);

          expect(press(line, "Backspace").defaultPrevented).toBe(false);
          expect(press(line, "Delete").defaultPrevented).toBe(false);
          expect(withoutTargetRanges("deleteContentBackward").defaultPrevented).toBe(false);
          expect(withoutTargetRanges("deleteContentForward").defaultPrevented).toBe(false);
        });

        describe("and the editor changes more than the text", () => {
          let changed: [string, string | undefined, string][];

          const selectBeyondTheText = () => {
            click(line);
            document.getSelection()?.setBaseAndExtent(textIn(line), startOfTheText(), tag, 1);
          };

          beforeEach(() => {
            changed = [];
            const execCommand = vi.fn((command: string, _ui: boolean, value?: string) => {
              changed.push([command, value, document.getSelection()?.toString() ?? ""]);
              return true;
            });
            Object.assign(document, { execCommand });
          });

          afterEach(() => Reflect.deleteProperty(document, "execCommand"));

          it("types over the text alone when the selection reaches into the elements beside it", () => {
            selectBeyondTheText();
            const event = new InputEvent("beforeinput", {
              bubbles: true,
              cancelable: true,
              data: "X",
              inputType: "insertText",
            });
            Object.defineProperty(event, "getTargetRanges", { value: () => [] });

            line.dispatchEvent(event);

            expect(event.defaultPrevented).toBe(true);
            expect(changed).toEqual([["insertText", "X", "OUR FIRST RELEASE"]]);
          });

          it("deletes the text alone when the selection reaches into the elements beside it", () => {
            const lineText = textIn(line);
            selectBeyondTheText();

            expect(withoutTargetRanges("deleteContentBackward").defaultPrevented).toBe(true);
            expect(changed).toEqual([]);
            expect(Array.from(line.childNodes)).toEqual([lineText, tag]);
            expect(lineText.data).toBe("\n   ");
          });

          it.each([
            ["Option and Backspace", "Backspace", { altKey: true }],
            ["Control and Backspace", "Backspace", { ctrlKey: true }],
            ["Command and Backspace", "Backspace", { metaKey: true }],
            ["Option and Delete", "Delete", { altKey: true }],
            ["Command and Delete", "Delete", { metaKey: true }],
          ])("leaves %s inside the text to the browser", (_, key, modifiers) => {
            putCaretAt(startOfTheText() + "OUR FIRST REL".length);

            expect(press(line, key, modifiers).defaultPrevented).toBe(false);
            expect(changed).toEqual([]);
          });

          it("deletes nothing with Option and Backspace at the start of the text", () => {
            putCaretAt(startOfTheText());

            expect(press(line, "Backspace", { altKey: true }).defaultPrevented).toBe(true);
            expect(changed).toEqual([]);
          });

          it("deletes the part of the text in the range the browser would delete beyond it", () => {
            putCaretAt(startOfTheText() + "OUR FIRST REL".length);
            const reach = document.createRange();
            reach.setStart(textIn(line), startOfTheText() + "OUR FIRST REL".length);
            reach.setEnd(tag, 1);
            const event = new InputEvent("beforeinput", {
              bubbles: true,
              cancelable: true,
              inputType: "deleteSoftLineForward",
            });
            Object.defineProperty(event, "getTargetRanges", { value: () => [reach] });

            line.dispatchEvent(event);

            expect(event.defaultPrevented).toBe(true);
            expect(changed).toEqual([]);
            expect(textIn(line).data).toBe("\n  OUR FIRST REL ");
            expect(Array.from(line.childNodes)).toEqual([textIn(line), tag]);
          });

          it("lets an undo and a redo happen", () => {
            selectBeyondTheText();

            expect(withoutTargetRanges("historyUndo").defaultPrevented).toBe(false);
            expect(withoutTargetRanges("historyRedo").defaultPrevented).toBe(false);
          });
        });

        it("keeps a new paragraph from splitting the line", () => {
          putCaretAt(startOfTheText() + 3);

          expect(withoutTargetRanges("insertParagraph").defaultPrevented).toBe(true);
        });
      });

      it("narrows a selection of the whole line to its text", () => {
        click(line);
        document.getSelection()?.selectAllChildren(line);

        document.dispatchEvent(new Event("selectionchange"));

        const selection = document.getSelection() as Selection;
        expect([selection.anchorNode, selection.focusNode]).toEqual([textIn(line), textIn(line)]);
        expect(selection.toString()).toBe(textIn(line).data);
      });

      it("brings a caret put beside the elements of the line back into its text", () => {
        click(line);
        document.getSelection()?.collapse(line, 2);

        document.dispatchEvent(new Event("selectionchange"));

        const selection = document.getSelection() as Selection;
        expect([selection.focusNode, selection.focusOffset]).toEqual([
          textIn(line),
          textIn(line).length,
        ]);
      });
    });

    it("keeps the lines of the text as the page broke them until the editor types", () => {
      click(heading);

      expect(heading.getAttribute("contenteditable")).toBe("true");

      heading.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "a" }));

      expect(heading.getAttribute("contenteditable")).toBe("plaintext-only");
    });

    it("breaks a long word as the page did while the text is edited, and leaves no style behind", () => {
      const pageStyle = document.createElement("style");
      pageStyle.textContent = "h1{overflow-wrap:normal;line-break:auto}";
      document.head.append(pageStyle);

      click(heading);

      expect(heading.style.getPropertyValue("overflow-wrap")).toBe("normal");
      expect(heading.style.getPropertyValue("line-break")).toBe("auto");

      press(heading, "Enter");

      expect(heading.hasAttribute("style")).toBe(false);
      pageStyle.remove();
    });

    it("types the first text itself when no key came before it, so the caret follows the text", () => {
      const execCommand = vi.fn();
      Object.assign(document, { execCommand });
      click(heading);

      const input = new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        data: "a",
        inputType: "insertText",
      });
      heading.dispatchEvent(input);

      expect(heading.getAttribute("contenteditable")).toBe("plaintext-only");
      expect(input.defaultPrevented).toBe(true);
      expect(execCommand).toHaveBeenCalledWith("insertText", false, "a");
      Reflect.deleteProperty(document, "execCommand");
    });

    it.each(["beforeinput", "paste", "cut", "drop", "compositionstart"])(
      "takes plain text only from the first %s on",
      (name) => {
        click(heading);

        heading.dispatchEvent(new Event(name, { bubbles: true }));

        expect(heading.getAttribute("contenteditable")).toBe("plaintext-only");
      }
    );

    it("leaves the text as the page had it when the edit ends before the editor types", () => {
      click(heading);
      heading.blur();
      heading.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "a" }));

      expect(heading.hasAttribute("contenteditable")).toBe(false);
    });

    it("draws one frame around the edited text and removes it when the edit ends", () => {
      click(heading);

      expect(document.querySelectorAll("[data-ve-editing-frame]")).toHaveLength(1);

      press(heading, "Enter");

      expect(document.querySelectorAll("[data-ve-editing-frame]")).toHaveLength(0);
    });

    it("sends the text the edit began from with every save of it", async () => {
      click(heading);
      type(heading, "Hello w");
      await pause();
      type(heading, "Hello world");
      await pause();

      expect(sentToEndpoint().map(({ base }) => base)).toEqual(["Hello", "Hello w"]);
    });

    it("saves what the editor typed once the typing pauses", async () => {
      click(heading);
      type(heading, "Hello w");
      type(heading, "Hello world");

      await pause();

      expect(sentToEndpoint()).toEqual([
        { ...PAGE, base: "Hello", key: "title", locale: "en", value: "Hello world" },
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

    describe("line breaks", () => {
      const LINES = "One\r\nTwo\u2028Three\vFour";
      let execCommand: ReturnType<typeof vi.fn>;
      let summary: HTMLElement;

      beforeEach(() => {
        execCommand = vi.fn();
        Object.assign(document, { execCommand });
        summary = render(stega("Lines", "summary", { multiline: true }));
        overlay.dispose();
        start();
      });

      afterEach(() => Reflect.deleteProperty(document, "execCommand"));

      it("are left to the page on Shift and Enter in a field of several lines", () => {
        click(summary);

        const enter = press(summary, "Enter", { shiftKey: true });

        expect(enter.defaultPrevented).toBe(false);
        expect(summary.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(true);
      });

      it("end the edit on Shift and Enter in a field of one line, as Enter does", () => {
        click(heading);

        const enter = press(heading, "Enter", { shiftKey: true });

        expect(enter.defaultPrevented).toBe(true);
        expect(heading.hasAttribute(DATA_VE_EDITING_ATTR)).toBe(false);
      });

      it("of a pasted text become spaces in a field of one line", () => {
        click(heading);

        const pasted = paste(heading, LINES);

        expect(pasted.defaultPrevented).toBe(true);
        expect(execCommand).toHaveBeenCalledWith("insertText", false, "One Two Three Four");
      });

      it("of a pasted text are kept in a field of several lines", () => {
        click(summary);

        const pasted = paste(summary, LINES);

        expect(pasted.defaultPrevented).toBe(false);
        expect(execCommand).not.toHaveBeenCalled();
      });

      it("of text that arrives without a key become spaces in a field of one line", () => {
        click(heading);

        const typed = inputBefore(heading, { data: "a\nb", inputType: "insertText" });

        expect(typed.defaultPrevented).toBe(true);
        expect(execCommand).toHaveBeenCalledWith("insertText", false, "a b");
      });

      it.each(["insertLineBreak", "insertParagraph"])(
        "are never inserted by %s in a field of one line",
        (inputType) => {
          click(heading);
          inputBefore(heading, { data: "x", inputType: "insertText" });

          expect(inputBefore(heading, { inputType }).defaultPrevented).toBe(true);
        }
      );

      it.each(["insertLineBreak", "insertParagraph"])(
        "are left to the page on %s in a field of several lines",
        (inputType) => {
          click(summary);
          inputBefore(summary, { data: "x", inputType: "insertText" });

          expect(inputBefore(summary, { inputType }).defaultPrevented).toBe(false);
        }
      );
    });

    it("ends the edit when the text loses the focus", async () => {
      click(heading);
      type(heading, "Hello world");

      heading.dispatchEvent(new FocusEvent("blur"));
      await flushMutations();

      expect(heading.hasAttribute("contenteditable")).toBe(false);
      expect(sentToEndpoint()).toHaveLength(1);
    });

    it("shows the text the edit began with on Escape and sends nothing when nothing was sent yet", async () => {
      click(heading);
      type(heading, "Changed");

      press(heading, "Escape");
      await pause();

      expect(heading.textContent).toBe("Hello");
      expect(heading.hasAttribute("contenteditable")).toBe(false);
      expect(fetchEndpoint).not.toHaveBeenCalled();
    });

    it("sends the text the edit began with on Escape once a typed text was sent", async () => {
      click(heading);
      type(heading, "Changed");
      await pause();
      type(heading, "Changed again");

      press(heading, "Escape");
      await pause();

      expect(heading.textContent).toBe("Hello");
      expect(sentToEndpoint().map(({ value }) => value)).toEqual(["Changed", "Hello"]);
    });

    it("says why the endpoint refused the edit", async () => {
      fetchEndpoint.mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.resolve({ reason: "locked", saved: false }),
          ok: false,
        } as Response)
      );
      click(heading);
      type(heading, "Changed");

      await pause();

      expect(statusLabel()).toBe("Locked by another editor");
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

  describe("on a page a window of the admin opened", () => {
    const postToOpener = vi.fn();

    beforeEach(() => {
      postToOpener.mockClear();
      stubOpenerWindow({ closed: false, postMessage: postToOpener });
      start();
    });

    it("saves through the endpoint while the admin told it nothing of a form", async () => {
      click(heading);
      type(heading, "Hello world");
      await pause();

      expect(sentToEndpoint()).toEqual([
        { ...PAGE, base: "Hello", key: "title", locale: "en", value: "Hello world" },
      ]);
      expect(messagesOfType(postToOpener, VE_FIELD_EDIT_TYPE)).toEqual([]);
    });

    it("posts to the form once the admin sent the values of one", async () => {
      postFromAdmin(
        {
          ...PAGE,
          fields: [{ key: "title", saved: "Hello", value: "Hello" }],
          locale: "en",
          type: VE_FIELD_SNAPSHOT_TYPE,
        },
        { source: window.opener }
      );
      await flushMutations();

      click(heading);
      type(heading, "Hello world");
      await pause();

      expect(sentToEndpoint()).toEqual([]);
      expect(messagesOfType(postToOpener, VE_FIELD_EDIT_TYPE)).toHaveLength(1);
    });

    it("keeps saving an edit through the endpoint when the admin sends the values of a form while it runs", async () => {
      click(heading);
      type(heading, "Hello");

      postFromAdmin(
        {
          ...PAGE,
          fields: [{ key: "title", saved: "Hello", value: "Hello" }],
          locale: "en",
          type: VE_FIELD_SNAPSHOT_TYPE,
        },
        { source: window.opener }
      );
      type(heading, "Hello world");
      await pause();

      expect(sentToEndpoint()).toEqual([
        { ...PAGE, base: "Hello", key: "title", locale: "en", value: "Hello world" },
      ]);
      expect(messagesOfType(postToOpener, VE_FIELD_EDIT_TYPE)).toEqual([]);
    });

    it("saves an edit begun in the form through the endpoint once the window of the admin is closed", async () => {
      const opener = { closed: false, postMessage: postToOpener };
      stubOpenerWindow(opener);
      postFromAdmin(
        {
          ...PAGE,
          fields: [{ key: "title", saved: "Hello", value: "Hello" }],
          locale: "en",
          type: VE_FIELD_SNAPSHOT_TYPE,
        },
        { source: opener }
      );
      await flushMutations();
      click(heading);

      opener.closed = true;
      type(heading, "Hello world");
      await pause();

      expect(messagesOfType(postToOpener, VE_FIELD_EDIT_TYPE)).toEqual([]);
      expect(sentToEndpoint()).toMatchObject([{ key: "title", value: "Hello world" }]);
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

    it("leaves the form where it is when an edit begins, so the frame of the page never moves", () => {
      postFromAdmin(snapshot("Hello"));

      click(heading);

      expect(heading.getAttribute("contenteditable")).toBe("true");
      expect(messagesOfType(postToAdmin, VE_MESSAGE_TYPE)).toEqual([]);
    });

    it("posts what the editor typed to the form of the admin", async () => {
      postFromAdmin(snapshot("Hello"));
      click(heading);
      type(heading, "Hello world");

      await pause();

      expect(messagesOfType(postToAdmin, VE_FIELD_EDIT_TYPE)).toEqual([
        { ...PAGE, key: "title", locale: "en", type: VE_FIELD_EDIT_TYPE, value: "Hello world" },
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

    it("says why the form did not take the edit, as the endpoint says it", async () => {
      postFromAdmin(snapshot("Hello"));
      click(heading);
      type(heading, "Hello world");
      await pause();

      postFromAdmin({
        ...PAGE,
        key: "title",
        locale: "en",
        reason: "not-editable",
        type: "ve:field-edit-refused",
      });

      expect(statusLabel()).toBe("This field cannot be edited here");
    });

    it("says the edit is saved when the admin saved the document", async () => {
      postFromAdmin(snapshot("Hello"));
      click(heading);
      type(heading, "Hello world");
      await pause();
      expect(statusLabel()).toBe("In the admin form, not saved yet");

      postFromAdmin({ ...PAGE, locale: "en", type: VE_DOCUMENT_SAVED_TYPE });

      expect(statusLabel()).toBe("Saved");
    });
  });
});
