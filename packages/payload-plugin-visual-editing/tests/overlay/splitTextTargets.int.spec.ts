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

    expect(open).toHaveBeenCalledWith("/admin/edit?path=title", "_blank");
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

    expect(open).toHaveBeenCalledWith("/admin/edit?path=title", "_blank");
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
