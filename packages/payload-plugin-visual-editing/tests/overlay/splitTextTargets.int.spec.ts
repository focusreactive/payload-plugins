import type { MockInstance } from "vitest";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Overlay, OverlayCtx } from "../../src/client/createOverlay";

import { DATA_VE_TARGET_ATTR } from "../../src/client/overlay/constants";
import { createOverlay } from "../../src/client/createOverlay";
import {
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_PATH_ATTR,
  VE_IDENTITY_ATTRS,
} from "../../src/shared/protocol";

import { markedText, markedTextNode } from "../support/markedData";
import { click, overlayCtx } from "../support/overlay";
import { ADMIN_ORIGIN } from "../support/previewWindow";
import { flushMutations } from "../support/time";

const buildAdminEditUrl = vi.fn(({ path }: { path: string }) => `/admin/edit?path=${path}`);

const ctx = overlayCtx({ buildAdminEditUrl });

let mode: OverlayCtx["mode"] = "always";

const page = { collectionSlug: "page", docId: "1", kind: "collection" } as const;

const marked = (visible: string, path: string) => markedText(visible, { ...page, path });

const splitIntoWords = (element: HTMLElement) => {
  const words = (element.textContent ?? "").split(" ").map((word) => {
    const wordElement = document.createElement("div");
    wordElement.append(document.createTextNode(word));
    return wordElement;
  });
  element.replaceChildren(...words.flatMap((word, index) => (index === 0 ? [word] : [" ", word])));
  return words;
};

const identityAttrsOn = (element: Element) =>
  VE_IDENTITY_ATTRS.filter((attr) => element.hasAttribute(attr));

describe("a heading a site script splits into words after the overlay found it", () => {
  let main: HTMLElement;
  let heading: HTMLHeadingElement;
  let open: MockInstance<typeof window.open>;
  let overlay: Overlay | undefined;

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    heading = document.createElement("h2");
    heading.className = "js-title";
    heading.textContent = marked("How We Deliver", "title");
    main.append(heading);
    document.body.append(main);
    open = vi.spyOn(window, "open").mockImplementation(() => null);
    mode = "always";
    overlay = createOverlay(main, () => ({ ...ctx, mode }));
  });

  afterEach(() => {
    overlay?.dispose();
    open.mockRestore();
  });

  it("stays one edit target", async () => {
    splitIntoWords(heading);
    await flushMutations();

    expect(main.querySelectorAll(`[${DATA_VE_TARGET_ATTR}]`)).toHaveLength(1);
    expect(heading.getAttribute(DATA_VE_TARGET_ATTR)).toBe("title");
  });

  it("opens the field on a click on a word", async () => {
    const [firstWord] = splitIntoWords(heading);
    await flushMutations();

    click(firstWord!);

    expect(open).toHaveBeenCalledWith(`${ADMIN_ORIGIN}/admin/edit?path=title`, "_blank");
  });

  it("is a target again when the edit targets are switched off and on after the split", async () => {
    splitIntoWords(heading);
    await flushMutations();
    mode = "off";
    overlay?.applyMode();

    mode = "hover";
    overlay?.applyMode();

    expect(heading.getAttribute(DATA_VE_TARGET_ATTR)).toBe("title");
  });

  it("opens the field on a click on a word after the edit targets are switched on again", async () => {
    const [, secondWord] = splitIntoWords(heading);
    await flushMutations();
    mode = "off";
    overlay?.applyMode();
    mode = "always";
    overlay?.applyMode();

    click(secondWord!);

    expect(open).toHaveBeenCalledWith(`${ADMIN_ORIGIN}/admin/edit?path=title`, "_blank");
  });

  it("leaves no identity attribute on the heading once disposed", async () => {
    splitIntoWords(heading);
    await flushMutations();

    overlay?.dispose();
    overlay = undefined;

    expect(identityAttrsOn(heading)).toEqual([]);
    expect(heading.hasAttribute(DATA_VE_TARGET_ATTR)).toBe(false);
  });

  it("gives the heading its marked text back when disposed before a split", () => {
    overlay?.dispose();
    overlay = undefined;

    expect(heading.textContent).toBe(marked("How We Deliver", "title"));
    expect(identityAttrsOn(heading)).toEqual([]);
  });
});

describe("an element whose text is more than one field", () => {
  let main: HTMLElement;
  let paragraph: HTMLParagraphElement;
  let overlay: Overlay;

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    paragraph = document.createElement("p");
    paragraph.append(
      document.createTextNode(marked("Ann", "author")),
      document.createTextNode(" wrote "),
      document.createTextNode(marked("Notes", "title"))
    );
    main.append(paragraph);
    document.body.append(main);
    overlay = createOverlay(main, () => ctx);
  });

  afterEach(() => {
    overlay.dispose();
  });

  it("gets no identity attributes", () => {
    expect(paragraph.hasAttribute(DATA_VE_PATH_ATTR)).toBe(false);
  });

  it("gets no identity attributes from a field next to plain text", () => {
    const label = document.createElement("span");
    label.append(document.createTextNode("By "), document.createTextNode(marked("Ann", "author")));
    main.append(label);
    overlay.dispose();
    overlay = createOverlay(main, () => ctx);

    expect(label.hasAttribute(DATA_VE_PATH_ATTR)).toBe(false);
  });
});

describe("a text of rich text", () => {
  it("leaves the element around it without identity attributes", () => {
    document.body.innerHTML = "";
    const main = document.createElement("main");
    const content = document.createElement("div");
    content.setAttribute(DATA_VE_PATH_ATTR, "content");
    content.setAttribute(DATA_VE_COLLECTION_ATTR, "page");
    const paragraph = document.createElement("p");
    paragraph.textContent = markedTextNode("Hello", "0.0", "abc123");
    content.append(paragraph);
    main.append(content);
    document.body.append(main);

    const overlay = createOverlay(main, () => ctx);

    expect(identityAttrsOn(paragraph)).toEqual([]);
    overlay.dispose();
  });
});

const splitIntoLetters = (element: HTMLElement) => {
  const words = (element.textContent ?? "").split(" ").map((word) => {
    const wordElement = document.createElement("div");
    for (const letter of word) {
      const letterElement = document.createElement("div");
      letterElement.textContent = letter;
      wordElement.append(letterElement);
    }
    return wordElement;
  });
  element.replaceChildren(...words.flatMap((word, index) => (index === 0 ? [word] : [" ", word])));
  return [...element.querySelectorAll("div > div")].map((letter) => letter.firstChild as Text);
};

const clickedAt = (letter: Text) =>
  Object.defineProperty(document, "caretRangeFromPoint", {
    configurable: true,
    value: () => {
      const range = document.createRange();
      range.setStart(letter, 0);
      return range;
    },
  });

const shownText = (element: HTMLElement = document.querySelector("h2") as HTMLElement) =>
  Array.from(element.childNodes)
    .filter((node) => !(node instanceof HTMLElement && node.style.display === "none"))
    .map(({ textContent }) => textContent)
    .join("")
    .trim();

const caret = () => {
  const selection = document.getSelection() as Selection;
  return [selection.focusNode, selection.focusOffset];
};

describe("a heading a site script splits into an element per letter, edited on the page", () => {
  let main: HTMLElement;
  let heading: HTMLHeadingElement;
  let overlay: Overlay;
  let open: MockInstance<typeof window.open>;
  let fetchEndpoint: ReturnType<typeof vi.fn>;

  const sentToEndpoint = () =>
    fetchEndpoint.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));

  beforeEach(async () => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    heading = document.createElement("h2");
    heading.textContent = marked("How We Deliver", "title");
    main.append(heading);
    document.body.append(main);
    fetchEndpoint = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ saved: true }), ok: true } as Response)
    );
    vi.stubGlobal("fetch", fetchEndpoint);
    open = vi.spyOn(window, "open").mockImplementation(() => null);
    overlay = createOverlay(main, () =>
      overlayCtx({
        inlineEditing: true,
        instantPreview: true,
        mode: "hover",
        payloadApi: "https://cms.example.com/api",
      })
    );
  });

  afterEach(() => {
    overlay.dispose();
    open.mockRestore();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, "caretRangeFromPoint");
    document.getSelection()?.removeAllRanges();
  });

  it("edits the heading as one text, with the caret at the letter clicked", async () => {
    const letters = splitIntoLetters(heading);
    await flushMutations();
    const letterW = letters[3];
    clickedAt(letterW as Text);

    const event = click(letterW?.parentElement as Element);

    expect(event.defaultPrevented).toBe(true);
    expect(open).not.toHaveBeenCalled();
    expect(heading.getAttribute("contenteditable")).toBe("true");
    expect(shownText()).toBe("How We Deliver");
    expect(heading.firstChild).toBeInstanceOf(Text);
    expect(letters.every(({ isConnected }) => isConnected)).toBe(true);
    expect(caret()).toEqual([heading.firstChild, "How ".length]);
  });

  it("edits only the value of a heading whose template indents it, without the indentation", async () => {
    overlay.dispose();
    heading.textContent = `\n      ${marked("How We Deliver", "title")}\n    `;
    overlay = createOverlay(main, () =>
      overlayCtx({
        inlineEditing: true,
        instantPreview: true,
        mode: "hover",
        payloadApi: "https://cms.example.com/api",
      })
    );
    const letterW = splitIntoLetters(heading).find(({ data }) => data === "W") as Text;
    await flushMutations();
    clickedAt(letterW);

    click(letterW.parentElement as Element);

    expect((heading.firstChild as Text).data).toBe("How We Deliver");
    expect(caret()).toEqual([heading.firstChild, "How ".length]);
  });

  it("saves the whole heading with the text typed where the letter was clicked", async () => {
    const letters = splitIntoLetters(heading);
    const splitNodes = Array.from(heading.childNodes);
    await flushMutations();
    clickedAt(letters[3] as Text);
    click(letters[3]?.parentElement as Element);

    (heading.firstChild as Text).insertData("How ".length, "X");
    document.getSelection()?.collapse(heading.firstChild, "How X".length);
    heading.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    heading.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" })
    );
    await flushMutations();

    expect(sentToEndpoint().map(({ base, value }) => [base, value])).toEqual([
      ["How We Deliver", "How XWe Deliver"],
    ]);
    expect(Array.from(heading.childNodes)).toEqual(splitNodes);
    expect(heading.textContent).toBe("How We Deliver");
    expect(splitNodes.some((node) => node instanceof Element && node.hasAttribute("style"))).toBe(
      false
    );
  });

  it("gives the owner of the split back the very nodes it made, so it can move and remove them after the edit", async () => {
    const letters = splitIntoLetters(heading);
    const [first, space, second] = Array.from(heading.childNodes);
    await flushMutations();
    clickedAt(letters[0] as Text);
    click(letters[0]?.parentElement as Element);
    heading.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" })
    );
    await flushMutations();

    const removeChildOfTheOwner = Node.prototype.removeChild;
    heading.insertBefore(second as Node, first as Node);
    removeChildOfTheOwner.call(heading, space as Node);
    removeChildOfTheOwner.call(heading, first as Node);

    expect(Array.from(heading.childNodes).slice(0, 1)).toEqual([second]);
    expect(heading.textContent).toBe("We Deliver");
  });

  it("keeps the typed text and the caret when the script splits the heading again while it is edited", async () => {
    const letters = splitIntoLetters(heading);
    await flushMutations();
    clickedAt(letters[3] as Text);
    click(letters[3]?.parentElement as Element);
    const edited = heading.firstChild as Text;
    edited.insertData("How ".length, "X");
    document.getSelection()?.collapse(edited, "How X".length);
    heading.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));

    heading.replaceChildren(edited.data);
    splitIntoLetters(heading);
    await flushMutations();

    expect(heading.firstChild).toBe(edited);
    expect(shownText()).toBe("How XWe Deliver");
    expect(caret()).toEqual([edited, "How X".length]);
  });

  it("keeps the typed text and hides the split again when its owner renders it again from the text it had before the edit", async () => {
    const letters = splitIntoLetters(heading);
    await flushMutations();
    clickedAt(letters[3] as Text);
    click(letters[3]?.parentElement as Element);
    const edited = heading.firstChild as Text;
    edited.insertData("How ".length, "X");
    document.getSelection()?.collapse(edited, "How X".length);
    heading.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));

    heading.replaceChildren("How We Deliver");
    const rendered = splitIntoLetters(heading);
    await flushMutations();

    expect(heading.firstChild).toBe(edited);
    expect(shownText()).toBe("How XWe Deliver");
    expect(caret()).toEqual([edited, "How X".length]);
    expect(
      rendered.every((letter) => letter.parentElement?.parentElement?.style.display === "none")
    ).toBe(true);
  });

  it("lets go of the elements of a split its owner replaced during the edit, and shows them as they were", async () => {
    const letters = splitIntoLetters(heading);
    const firstSplit = Array.from(heading.children) as HTMLElement[];
    await flushMutations();
    clickedAt(letters[0] as Text);
    click(letters[0]?.parentElement as Element);

    heading.replaceChildren("How We Deliver");
    splitIntoLetters(heading);
    await flushMutations();

    expect(firstSplit.map((word) => word.hasAttribute("style"))).toEqual([false, false, false]);
  });

  it("keeps the text and the caret of an edit that began before the script split the heading", async () => {
    click(heading);
    const edited = heading.firstChild as Text;
    document.getSelection()?.collapse(edited, "How We".length);
    document.dispatchEvent(new Event("selectionchange"));

    splitIntoLetters(heading);
    await flushMutations();

    expect(heading.firstChild).toBe(edited);
    expect(shownText()).toBe("How We Deliver");
    expect(caret()).toEqual([edited, "How We".length]);
    expect(heading.getAttribute("contenteditable")).toBe("true");
  });

  describe("whose script styles the elements of the split while the heading is edited", () => {
    let word: HTMLElement;

    const escape = () =>
      heading.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" })
      );

    beforeEach(async () => {
      const letters = splitIntoLetters(heading);
      word = heading.firstElementChild as HTMLElement;
      word.setAttribute("style", "display: inline-block; color: red");
      await flushMutations();
      clickedAt(letters[0] as Text);
      click(letters[0]?.parentElement as Element);
    });

    it("gives the elements back the style they had, word for word, when the script left them alone", async () => {
      escape();
      await flushMutations();

      expect(word.getAttribute("style")).toBe("display: inline-block; color: red");
    });

    it("keeps what the script styled during the edit when the edit ends", async () => {
      word.style.transform = "translateY(10px)";
      await flushMutations();

      escape();
      await flushMutations();

      expect(word.style.transform).toBe("translateY(10px)");
      expect(word.style.display).toBe("inline-block");
      expect(word.style.color).toBe("red");
    });

    it("keeps the elements hidden while the script rewrites their whole style", async () => {
      word.style.cssText = "opacity: 0.5";
      await flushMutations();

      expect(word.style.display).toBe("none");

      escape();
      await flushMutations();

      expect(word.style.opacity).toBe("0.5");
      expect(word.style.display).toBe("");
    });
  });

  it("gives the split back as it was when the edit of the heading cannot begin", async () => {
    const other = document.createElement("p");
    other.textContent = marked("Lead", "lead");
    main.append(other);
    overlay.dispose();
    overlay = createOverlay(main, () =>
      overlayCtx({
        inlineEditing: true,
        instantPreview: true,
        mode: "hover",
        payloadApi: "https://cms.example.com/api",
      })
    );
    const letters = splitIntoLetters(heading);
    const splitNodes = Array.from(heading.childNodes);
    await flushMutations();
    click(other);
    const blur = vi.spyOn(HTMLElement.prototype, "blur").mockImplementation(() => {
      throw new Error("blur failed");
    });
    const reportError = vi.fn((event: ErrorEvent) => event.preventDefault());
    window.addEventListener("error", reportError);

    click(letters[0]?.parentElement as Element);

    window.removeEventListener("error", reportError);
    blur.mockRestore();
    expect(reportError).toHaveBeenCalled();
    expect(Array.from(heading.childNodes)).toEqual(splitNodes);
    expect(splitNodes.some((node) => node instanceof Element && node.hasAttribute("style"))).toBe(
      false
    );
  });

  it("gives the split back as it was when the overlay is disposed during the edit", async () => {
    const letters = splitIntoLetters(heading);
    const splitNodes = Array.from(heading.childNodes);
    await flushMutations();
    clickedAt(letters[0] as Text);
    click(letters[0]?.parentElement as Element);

    overlay.dispose();
    overlay = createOverlay(main, () => overlayCtx({ mode: "hover" }));

    expect(Array.from(heading.childNodes)).toEqual(splitNodes);
    expect(splitNodes.some((node) => node instanceof Element && node.hasAttribute("style"))).toBe(
      false
    );
  });

  it("leaves a split heading whose field the page cannot edit split, without asking where the click landed", async () => {
    overlay.dispose();
    heading.textContent = markedText("How We Deliver", { ...page, locale: "en", path: "title" });
    overlay = createOverlay(main, () =>
      overlayCtx({
        inlineEditing: true,
        instantPreview: true,
        mode: "hover",
        payloadApi: "https://cms.example.com/api",
      })
    );
    const letters = splitIntoLetters(heading);
    await flushMutations();
    const caretRangeFromPoint = vi.fn(() => null);
    Object.defineProperty(document, "caretRangeFromPoint", {
      configurable: true,
      value: caretRangeFromPoint,
    });

    click(letters[3]?.parentElement as Element);

    expect(caretRangeFromPoint).not.toHaveBeenCalled();
    expect(heading.querySelectorAll("div > div")).toHaveLength("HowWeDeliver".length);
    expect(heading.hasAttribute("contenteditable")).toBe(false);
  });

  it("opens the field in the admin when the split text is not the text of the field", async () => {
    splitIntoLetters(heading);
    heading.append(" now");
    await flushMutations();

    click(heading.querySelector("div > div") as Element);

    expect(open).toHaveBeenCalledTimes(1);
    expect(heading.hasAttribute("contenteditable")).toBe(false);
    expect(heading.querySelectorAll("div > div")).toHaveLength("HowWeDeliver".length);
  });
});

describe("a page whose script split the marker of a heading into pieces before the overlay started", () => {
  it("starts the overlay and finds the other fields of the page", () => {
    document.body.innerHTML = "";
    const main = document.createElement("main");
    const heading = document.createElement("h2");
    const markerOfTheHeading = [...marked("Work", "title")].slice("Work".length);
    heading.append(
      ...[0, 8, 16].map((start) => {
        const piece = document.createElement("div");
        piece.textContent = markerOfTheHeading.slice(start, start + 8).join("");
        return piece;
      })
    );
    const lead = document.createElement("p");
    lead.textContent = marked("Lead", "lead");
    main.append(heading, lead);
    document.body.append(main);

    const overlay = createOverlay(main, () => ({ ...ctx, mode: "always" }));

    expect(lead.getAttribute(DATA_VE_TARGET_ATTR)).toBe("lead");
    overlay.dispose();
  });
});
