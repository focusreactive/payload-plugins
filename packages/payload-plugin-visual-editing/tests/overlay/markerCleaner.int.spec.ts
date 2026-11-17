import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MarkerCleaner } from "../../src/client/overlay/markerCleaner";

import { cleanPageAround } from "../../src/client/overlay/markerCleaner";
import { markedText } from "../support/markedData";
import { flushMutations } from "../support/time";

const PAGE = { collectionSlug: "page", docId: "1", kind: "collection" } as const;

const TITLE = markedText("About us", { ...PAGE, path: "title" });
const IMAGE_ALT = markedText("A team photo", { ...PAGE, path: "image.alt" });
const SEO_TITLE = markedText("About us | Site", { ...PAGE, path: "meta.title" });
const SEO_DESCRIPTION = markedText("Who we are", { ...PAGE, path: "meta.description" });
const SCRIPT_TEXT = `window.pageTitle = "${TITLE}";`;

const metaContent = (property: string) =>
  document.head.querySelector(`meta[property="${property}"]`)?.getAttribute("content");

describe("the marker cleaner of a page without an overlay", () => {
  let main: HTMLElement;
  let heading: HTMLHeadingElement;
  let image: HTMLImageElement;
  let script: HTMLScriptElement;
  let cleaner: MarkerCleaner | null;

  beforeEach(() => {
    cleaner = null;
    document.title = SEO_TITLE;
    document.head.insertAdjacentHTML(
      "beforeend",
      `<meta property="og:title" content="${SEO_TITLE}"><meta property="og:description" content="${SEO_DESCRIPTION}">`
    );
    main = document.createElement("main");
    heading = document.createElement("h1");
    heading.textContent = TITLE;
    heading.setAttribute("aria-label", TITLE);
    image = document.createElement("img");
    image.alt = IMAGE_ALT;
    script = document.createElement("script");
    script.textContent = SCRIPT_TEXT;
    main.append(heading, image, script);
    document.body.append(main);
  });

  afterEach(() => {
    cleaner?.dispose();
    vi.restoreAllMocks();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("cleans the text, every attribute, the title and the meta tags of the head", () => {
    cleaner = cleanPageAround(main);

    expect(heading.textContent).toBe("About us");
    expect(heading.getAttribute("aria-label")).toBe("About us");
    expect(image.alt).toBe("A team photo");
    expect(document.title).toBe("About us | Site");
    expect(metaContent("og:title")).toBe("About us | Site");
    expect(metaContent("og:description")).toBe("Who we are");
  });

  it("leaves the text of scripts alone", () => {
    cleaner = cleanPageAround(main);

    expect(script.textContent).toBe(SCRIPT_TEXT);
  });

  it("cleans content added later and text and attributes written again", async () => {
    cleaner = cleanPageAround(main);
    const section = document.createElement("section");
    section.innerHTML = `<h2 title="${TITLE}">${TITLE}</h2>`;
    main.append(section);
    heading.firstChild!.textContent = markedText("About them", { ...PAGE, path: "title" });
    image.alt = IMAGE_ALT;
    document.title = SEO_TITLE;
    await flushMutations();

    expect(section.innerHTML).toBe('<h2 title="About us">About us</h2>');
    expect(heading.textContent).toBe("About them");
    expect(image.alt).toBe("A team photo");
    expect(document.title).toBe("About us | Site");
  });

  it("gives the markers back when it stops, except where the page changed the value", async () => {
    cleaner = cleanPageAround(main);
    image.alt = "Changed by the page";
    await flushMutations();

    cleaner.dispose();
    cleaner = null;

    expect(heading.textContent).toBe(TITLE);
    expect(heading.getAttribute("aria-label")).toBe(TITLE);
    expect(image.alt).toBe("Changed by the page");
    expect(document.title).toBe(SEO_TITLE);
    expect(metaContent("og:title")).toBe(SEO_TITLE);
  });

  it("stops cleaning when it stops", async () => {
    cleaner = cleanPageAround(main);
    cleaner.dispose();
    cleaner = null;

    heading.setAttribute("title", TITLE);
    await flushMutations();

    expect(heading.getAttribute("title")).toBe(TITLE);
  });

  it("walks no tree for an attribute the page changes", async () => {
    cleaner = cleanPageAround(main);
    const walks = vi.spyOn(document, "createTreeWalker");

    main.setAttribute("class", "is-scrolled");
    main.setAttribute("title", TITLE);
    await flushMutations();

    expect(walks).not.toHaveBeenCalled();
    expect(main.getAttribute("title")).toBe("About us");
  });
});
