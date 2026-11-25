import { afterEach, describe, expect, it } from "vitest";

import { rectInZoomOf, zoomOf } from "../../src/client/overlay/zoom";

import { zoomEveryElement, zoomNoElement } from "../support/zoom";

const PAGE_ZOOM = 1.25;

const boxOf = ({ height, left, top, width }: DOMRect) => ({ height, left, top, width });

describe("the zoom of an element of the overlay", () => {
  afterEach(zoomNoElement);

  it("is 1 in a browser that does not tell it", () => {
    expect(zoomOf(document.body)).toBe(1);
  });

  it("is the zoom the browser tells for the element", () => {
    zoomEveryElement(PAGE_ZOOM);

    expect(zoomOf(document.body)).toBe(PAGE_ZOOM);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("is 1 for a zoom of %s", (zoom) => {
    zoomEveryElement(zoom);

    expect(zoomOf(document.body)).toBe(1);
  });
});

describe("a measured rectangle in the space of an element of the overlay", () => {
  afterEach(zoomNoElement);

  it("is the same rectangle when nothing is zoomed", () => {
    const measured = new DOMRect(752, 303, 567, 294);

    expect(rectInZoomOf(document.body, measured)).toBe(measured);
  });

  it("is divided by the zoom the element is drawn with, so the zoom does not apply twice", () => {
    zoomEveryElement(PAGE_ZOOM);

    expect(boxOf(rectInZoomOf(document.body, new DOMRect(500, 250, 400, 200)))).toEqual({
      height: 160,
      left: 400,
      top: 200,
      width: 320,
    });
  });
});
