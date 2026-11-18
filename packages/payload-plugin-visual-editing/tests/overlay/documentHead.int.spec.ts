import { afterEach, describe, expect, it } from "vitest";

import { createOverlay } from "../../src/client/createOverlay";
import { markedText } from "../support/markedData";
import { overlayCtx } from "../support/overlay";

const markedTitle = markedText("About us", {
  collectionSlug: "page",
  docId: "1",
  kind: "collection",
  path: "seo.title",
});

const markedDescription = markedText("Who we are", {
  collectionSlug: "page",
  docId: "1",
  kind: "collection",
  path: "seo.description",
});

const metaContent = (name: string) =>
  document.head.querySelector(`meta[name="${name}"]`)?.getAttribute("content");

describe("the document head", () => {
  afterEach(() => {
    document.title = "";
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("loses its markers while the overlay runs and gets them back when it stops", () => {
    document.title = markedTitle;
    const overlay = createOverlay(document.body, () => overlayCtx());

    expect(document.title).toBe("About us");

    overlay.dispose();
    expect(document.title).toBe(markedTitle);
  });

  it("keeps a title the page changed meanwhile", () => {
    document.title = markedTitle;
    const overlay = createOverlay(document.body, () => overlayCtx());
    document.title = "Contact";

    overlay.dispose();

    expect(document.title).toBe("Contact");
  });

  it("loses the markers of its meta tags while the overlay runs and gets them back when it stops", () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      `<meta name="description" content="${markedDescription}"><meta name="twitter:title" content="${markedTitle}">`
    );
    const overlay = createOverlay(document.body, () => overlayCtx());

    expect(metaContent("description")).toBe("Who we are");
    expect(metaContent("twitter:title")).toBe("About us");

    overlay.dispose();
    expect(metaContent("description")).toBe(markedDescription);
    expect(metaContent("twitter:title")).toBe(markedTitle);
  });
});
