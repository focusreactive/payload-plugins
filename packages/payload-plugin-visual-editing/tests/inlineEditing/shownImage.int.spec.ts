import { beforeEach, describe, expect, it } from "vitest";

import { absoluteUrlOf, showMedia } from "../../src/client/inlineEditing/shownImage";

const NEW_URL = "https://cms.example.com/api/media/file/lighthouse.jpg";

const attributesIn = (root: Element) =>
  [root, ...Array.from(root.querySelectorAll("*"))].map((element) =>
    Object.fromEntries(Array.from(element.attributes, ({ name, value }) => [name, value]))
  );

describe("the address of media on the page", () => {
  it("is resolved against the origin of the Payload API", () => {
    expect(absoluteUrlOf("/api/media/file/a.jpg", "https://cms.example.com/api")).toBe(
      "https://cms.example.com/api/media/file/a.jpg"
    );
  });

  it("stays as it is when it is absolute", () => {
    expect(absoluteUrlOf("https://cdn.example.com/a.jpg", "https://cms.example.com/api")).toBe(
      "https://cdn.example.com/a.jpg"
    );
  });

  it("is resolved against the page when the API is on the origin of the page", () => {
    expect(absoluteUrlOf("/api/media/file/a.jpg", "/api")).toBe(
      `${window.location.origin}/api/media/file/a.jpg`
    );
  });
});

describe("showing the picked media in an image of the page", () => {
  let picture: HTMLElement;
  let image: HTMLImageElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <picture>
        <source media="(min-width: 800px)" srcset="/old-large.webp 1x, /old-large@2x.webp 2x" sizes="50vw" type="image/webp">
        <source srcset="/old-small.webp">
        <img src="/old.jpg" srcset="/old.jpg 1x, /old@2x.jpg 2x" sizes="100vw" alt="A harbour" width="400" height="300">
      </picture>`;
    picture = document.querySelector("picture") as HTMLElement;
    image = document.querySelector("img") as HTMLImageElement;
  });

  it("points the image at the new file", () => {
    showMedia(image, { url: NEW_URL }, NEW_URL);

    expect(image.getAttribute("src")).toBe(NEW_URL);
  });

  it("drops the responsive variants of the old file from the image", () => {
    showMedia(image, { url: NEW_URL }, NEW_URL);

    expect(image.hasAttribute("srcset")).toBe(false);
    expect(image.hasAttribute("sizes")).toBe(false);
  });

  it("points every source of the picture at the new file and removes none", () => {
    showMedia(image, { url: NEW_URL }, NEW_URL);

    const sources = Array.from(picture.querySelectorAll("source"));
    expect(sources).toHaveLength(2);
    expect(sources.map((source) => source.getAttribute("srcset"))).toEqual([NEW_URL, NEW_URL]);
    expect(sources.map((source) => source.hasAttribute("sizes"))).toEqual([false, false]);
    expect(sources[0]!.getAttribute("media")).toBe("(min-width: 800px)");
  });

  it("leaves the description of the image alone", () => {
    showMedia(image, { url: NEW_URL }, NEW_URL);

    expect(image.getAttribute("alt")).toBe("A harbour");
  });

  it("keeps the width the page gave the image and follows the proportions of the new file", () => {
    showMedia(image, { height: 1000, url: NEW_URL, width: 1000 }, NEW_URL);

    expect(image.getAttribute("width")).toBe("400");
    expect(image.getAttribute("height")).toBe("400");
  });

  it("leaves the size alone when the new file has none or the page set none", () => {
    showMedia(image, { url: NEW_URL }, NEW_URL);
    expect(image.getAttribute("height")).toBe("300");

    image.removeAttribute("width");
    image.removeAttribute("height");
    showMedia(image, { height: 1000, url: NEW_URL, width: 1000 }, NEW_URL);
    expect(image.hasAttribute("height")).toBe(false);
  });

  it("puts back everything it changed when asked to", () => {
    const before = attributesIn(picture);

    const putBack = showMedia(image, { height: 1000, url: NEW_URL, width: 1000 }, NEW_URL);
    expect(attributesIn(picture)).not.toEqual(before);
    putBack();

    expect(attributesIn(picture)).toEqual(before);
    expect(picture.querySelectorAll("source")).toHaveLength(2);
  });

  it("shows the new file in an image without a picture around it", () => {
    document.body.innerHTML = '<img src="/old.jpg">';
    const alone = document.querySelector("img") as HTMLImageElement;

    showMedia(alone, { url: NEW_URL }, NEW_URL);

    expect(alone.getAttribute("src")).toBe(NEW_URL);
  });
});
