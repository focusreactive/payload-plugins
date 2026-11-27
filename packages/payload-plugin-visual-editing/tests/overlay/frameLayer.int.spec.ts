import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createOverlay } from "../../src/client/createOverlay";
import { DATA_VE_FRAME_ATTR } from "../../src/client/overlay/constants";

import { markedText } from "../support/markedData";
import { overlayCtx } from "../support/overlay";
import { zoomEveryElement, zoomNoElement } from "../support/zoom";

const PAGE_ZOOM = 1.25;

const framesOnPage = () => document.querySelectorAll<HTMLElement>(`[${DATA_VE_FRAME_ATTR}]`);

const markedHeading = (): HTMLElement => {
  const heading = document.createElement("h1");
  heading.textContent = markedText("Home", {
    collectionSlug: "page",
    docId: "1",
    kind: "collection",
    path: "title",
  });
  return heading;
};

describe("resting frames", () => {
  let main: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    main.append(markedHeading());
    document.body.append(main);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("draws one frame per target in always mode, outside the page", () => {
    const overlay = createOverlay(main, () => overlayCtx({ mode: "always" }));

    expect(framesOnPage()).toHaveLength(1);
    expect(main.contains(framesOnPage()[0] ?? null)).toBe(false);

    overlay.dispose();
    expect(framesOnPage()).toHaveLength(0);
  });

  it("draws a frame where its target is drawn on a page the site zoomed", () => {
    zoomEveryElement(PAGE_ZOOM);
    vi.spyOn(main.querySelector("h1") as HTMLElement, "getBoundingClientRect").mockReturnValue(
      new DOMRect(500, 250, 400, 200)
    );

    const overlay = createOverlay(main, () => overlayCtx({ mode: "always" }));

    const frame = framesOnPage()[0] as HTMLElement;
    expect([frame.style.transform, frame.style.width, frame.style.height]).toEqual([
      "translate(398.5px, 198.5px)",
      "323px",
      "163px",
    ]);

    overlay.dispose();
    zoomNoElement();
    vi.restoreAllMocks();
  });

  it("draws the frame around the glyphs of a heading whose line height is smaller than its text", () => {
    vi.spyOn(main.querySelector("h1") as HTMLElement, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 40, 400, 40)
    );
    Object.defineProperty(Range.prototype, "getClientRects", {
      configurable: true,
      value: () => [new DOMRect(0, 20, 380, 30), new DOMRect(0, 50, 200, 40)],
    });

    const overlay = createOverlay(main, () => overlayCtx({ mode: "always" }));

    const frame = framesOnPage()[0] as HTMLElement;
    expect([frame.style.transform, frame.style.width, frame.style.height]).toEqual([
      "translate(-1.5px, 18.5px)",
      "403px",
      "73px",
    ]);

    overlay.dispose();
    Reflect.deleteProperty(Range.prototype, "getClientRects");
    vi.restoreAllMocks();
  });

  it("draws no resting frames in hover mode", () => {
    const overlay = createOverlay(main, () => overlayCtx({ mode: "hover" }));

    expect(framesOnPage()).toHaveLength(0);

    overlay.dispose();
  });
});
