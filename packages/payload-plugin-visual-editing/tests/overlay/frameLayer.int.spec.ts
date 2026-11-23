import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createOverlay } from "../../src/client/createOverlay";
import { DATA_VE_FRAME_ATTR } from "../../src/client/overlay/constants";

import { markedText } from "../support/markedData";
import { overlayCtx } from "../support/overlay";

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

  it("draws no resting frames in hover mode", () => {
    const overlay = createOverlay(main, () => overlayCtx({ mode: "hover" }));

    expect(framesOnPage()).toHaveLength(0);

    overlay.dispose();
  });
});
