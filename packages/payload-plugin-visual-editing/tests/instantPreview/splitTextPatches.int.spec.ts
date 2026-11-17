import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Overlay } from "../../src/client/createOverlay";
import type { VeFieldPatchMessage, VeFieldSnapshotMessage } from "../../src/shared/protocol";

import { createOverlay } from "../../src/client/createOverlay";
import { VE_FIELD_PATCH_TYPE, VE_FIELD_SNAPSHOT_TYPE } from "../../src/shared/protocol";

import { markedText } from "../support/markedData";
import { overlayCtx } from "../support/overlay";
import { postFromAdmin, restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";
import { flushMutations } from "../support/time";

const ctx = overlayCtx({ instantPreview: true, locale: "en", mode: "hover" });

const page = { collectionSlug: "page", kind: "collection", docId: "1", locale: "en" } as const;

const marked = (visible: string, path: string, key?: string) =>
  markedText(visible, { collectionSlug: "page", docId: "1", kind: "collection", key, path });

const snapshot = (key: string, saved: string): VeFieldSnapshotMessage => ({
  type: VE_FIELD_SNAPSHOT_TYPE,
  ...page,
  fields: [{ key, saved, value: saved }],
});

const patch = (key: string, value: string): VeFieldPatchMessage => ({
  type: VE_FIELD_PATCH_TYPE,
  ...page,
  patches: [{ key, value }],
});

const splitIntoWords = (element: HTMLElement, wordOf = (word: string) => word) => {
  const words = (element.textContent ?? "").split(" ").map((word) => {
    const wordElement = document.createElement("div");
    wordElement.append(document.createTextNode(wordOf(word)));
    return wordElement;
  });
  element.replaceChildren(...words.flatMap((word, index) => (index === 0 ? [word] : [" ", word])));
};

describe("instant text of a heading a site script split into words", () => {
  let main: HTMLElement;
  let heading: HTMLHeadingElement;
  let overlay: Overlay | undefined;

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    heading = document.createElement("h2");
    heading.textContent = marked("How We Deliver", "title");
    main.append(heading);
    document.body.append(main);
    stubAdminWindow({ postMessage: vi.fn() });
    overlay = createOverlay(main, () => ctx);
    postFromAdmin(snapshot("title", "How We Deliver"));
  });

  afterEach(() => {
    overlay?.dispose();
    restorePreviewWindow();
  });

  it("shows the patched value in the heading", async () => {
    splitIntoWords(heading);
    await flushMutations();

    postFromAdmin(patch("title", "How We Ship"));

    expect(heading.textContent).toBe("How We Ship");
  });

  it("keeps patching the heading after its text was written again", async () => {
    splitIntoWords(heading);
    await flushMutations();
    postFromAdmin(patch("title", "How We Ship"));
    await flushMutations();

    postFromAdmin(patch("title", "How We Ship It"));

    expect(heading.textContent).toBe("How We Ship It");
    expect(heading.childNodes).toHaveLength(1);
  });

  it("leaves a value the page transformed", async () => {
    splitIntoWords(heading, (word) => word.toUpperCase());
    await flushMutations();

    postFromAdmin(patch("title", "How We Ship"));

    expect(heading.textContent).toBe("HOW WE DELIVER");
  });

  it("gives the heading its marked text back when disposed", async () => {
    splitIntoWords(heading);
    await flushMutations();
    postFromAdmin(patch("title", "How We Ship"));

    overlay?.dispose();
    overlay = undefined;

    expect(heading.textContent).toBe(marked("How We Deliver", "title"));
    expect(heading.hasAttribute("data-ve-path")).toBe(false);
  });
});

describe("instant text of a link with an icon whose text a site script split into words", () => {
  let main: HTMLElement;
  let link: HTMLAnchorElement;
  let overlay: Overlay;

  const splitTextOfLink = () => {
    const words = (link.firstChild?.textContent ?? "").split(" ").map((word) => {
      const wordElement = document.createElement("span");
      wordElement.textContent = word;
      return wordElement;
    });
    link.firstChild?.replaceWith(
      ...words.flatMap((word, index) => (index === 0 ? [word] : [" ", word]))
    );
  };

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    link = document.createElement("a");
    link.innerHTML = '<svg class="icon"></svg><img alt="" src="/arrow.png">';
    link.prepend(document.createTextNode(marked("Read more", "cta")));
    main.append(link);
    document.body.append(main);
    stubAdminWindow({ postMessage: vi.fn() });
    overlay = createOverlay(main, () => ctx);
    postFromAdmin(snapshot("cta", "Read more"));
  });

  afterEach(() => {
    overlay.dispose();
    restorePreviewWindow();
  });

  it("shows the patched value and keeps the icons", async () => {
    splitTextOfLink();
    await flushMutations();

    postFromAdmin(patch("cta", "Read more!"));

    expect(link.textContent).toBe("Read more!");
    expect(link.querySelector("svg")).not.toBeNull();
    expect(link.querySelector("img")).not.toBeNull();
  });

  it("writes the value where the text was, before the icons", async () => {
    splitTextOfLink();
    await flushMutations();

    postFromAdmin(patch("cta", "Read on"));

    expect(Array.from(link.childNodes, ({ nodeName }) => nodeName)).toEqual([
      "#text",
      "svg",
      "IMG",
    ]);
  });
});

describe("instant text of an element with two fields", () => {
  let main: HTMLElement;
  let paragraph: HTMLParagraphElement;
  let overlay: Overlay;

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    paragraph = document.createElement("p");
    paragraph.append(
      document.createTextNode(marked("Ann", "author")),
      document.createTextNode(" "),
      document.createTextNode(marked("Notes", "title"))
    );
    main.append(paragraph);
    document.body.append(main);
    stubAdminWindow({ postMessage: vi.fn() });
    overlay = createOverlay(main, () => ctx);
    postFromAdmin(snapshot("title", "Notes"));
  });

  afterEach(() => {
    overlay.dispose();
    restorePreviewWindow();
  });

  it("does not write a field over the element when its text node is replaced", async () => {
    paragraph.replaceChildren("Ann Notes");
    await flushMutations();

    postFromAdmin(patch("title", "Notes"));
    postFromAdmin(patch("title", "Ann Notes"));

    expect(paragraph.childNodes).toHaveLength(1);
    expect(paragraph.textContent).toBe("Ann Notes");
  });
});

describe("instant text of a list whose heading a site script split into words", () => {
  let main: HTMLElement;
  let heading: HTMLHeadingElement;
  let overlay: Overlay;

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    heading = document.createElement("h3");
    heading.textContent = marked("First row", "blocks.0.heading", "blocks.row-a.heading");
    main.append(heading);
    document.body.append(main);
    stubAdminWindow({ postMessage: vi.fn() });
    overlay = createOverlay(main, () => ctx);
    postFromAdmin(snapshot("blocks.row-a.heading", "First row"));
  });

  afterEach(() => {
    overlay.dispose();
    restorePreviewWindow();
  });

  it("patches the row the heading shows after it is rendered again for another row", async () => {
    heading.firstChild!.textContent = marked(
      "Second row",
      "blocks.0.heading",
      "blocks.row-b.heading"
    );
    await flushMutations();
    postFromAdmin(snapshot("blocks.row-b.heading", "Second row"));
    splitIntoWords(heading);
    await flushMutations();

    postFromAdmin(patch("blocks.row-a.heading", "First row edited"));
    postFromAdmin(patch("blocks.row-b.heading", "Second row edited"));

    expect(heading.textContent).toBe("Second row edited");
  });

  it("patches the field the heading shows after it is rendered again under another path", async () => {
    heading.firstChild!.textContent = marked(
      "Second row",
      "blocks.1.heading",
      "blocks.row-b.heading"
    );
    await flushMutations();
    postFromAdmin(snapshot("blocks.row-b.heading", "Second row"));
    splitIntoWords(heading);
    await flushMutations();

    postFromAdmin(patch("blocks.row-b.heading", "Second row edited"));
    postFromAdmin(patch("blocks.row-a.heading", "First row edited"));

    expect(heading.textContent).toBe("Second row edited");
  });
});
