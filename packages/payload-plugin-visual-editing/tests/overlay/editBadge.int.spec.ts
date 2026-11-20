import { afterEach, describe, expect, it } from "vitest";

import { DATA_VE_COVER_ATTR } from "../../src/client/overlay/covers";
import { createEditBadge, placeBadge } from "../../src/client/overlay/editBadge";
import { boxOfTarget } from "../../src/client/overlay/frameLayer";

const box = (left: number, top: number, width: number, height: number) => ({
  bottom: top + height,
  left,
  right: left + width,
  top,
});

const domRect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    ...box(left, top, width, height),
    height,
    width,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

const badge = { height: 24, width: 60 };
const viewport = { height: 800, width: 1200 };
const header = box(0, 0, 1200, 64);

describe("placeBadge", () => {
  it("sits on the top right corner of the frame when there is room above it", () => {
    expect(
      placeBadge({
        badge,
        covers: [header],
        frameWidth: 2,
        target: box(100, 300, 400, 50),
        viewport,
      })
    ).toEqual({ left: 442, side: "above", top: 274 });
  });

  it("hangs inside the frame below a sticky header that takes the room above it", () => {
    expect(
      placeBadge({
        badge,
        covers: [header],
        frameWidth: 2,
        target: box(100, 70, 400, 200),
        viewport,
      })
    ).toEqual({ left: 442, side: "inside", top: 68 });
  });

  it("stays below the header for a tall target whose top is scrolled under it", () => {
    expect(
      placeBadge({
        badge,
        covers: [header],
        frameWidth: 2,
        target: box(100, -500, 400, 900),
        viewport,
      })
    ).toEqual({ left: 442, side: "inside", top: 64 });
  });

  it("stays in the viewport for a target scrolled above the top of a page without a header", () => {
    expect(
      placeBadge({ badge, covers: [], frameWidth: 2, target: box(100, -300, 400, 900), viewport })
    ).toMatchObject({ side: "inside", top: 0 });
  });

  it("goes below a short target that has no room above it", () => {
    expect(
      placeBadge({
        badge,
        covers: [header],
        frameWidth: 2,
        target: box(100, 66, 400, 20),
        viewport,
      })
    ).toEqual({ left: 442, side: "below", top: 88 });
  });

  it("ignores a cover that does not lie over the target", () => {
    const sidebar = box(900, 0, 300, 800);
    expect(
      placeBadge({
        badge,
        covers: [sidebar],
        frameWidth: 2,
        target: box(100, 10, 400, 200),
        viewport,
      })
    ).toMatchObject({ side: "inside", top: 8 });
    expect(
      placeBadge({
        badge,
        covers: [sidebar],
        frameWidth: 2,
        target: box(100, 40, 400, 200),
        viewport,
      })
    ).toMatchObject({ side: "above", top: 14 });
  });

  it("keeps the badge inside the viewport on the right", () => {
    expect(
      placeBadge({ badge, covers: [], frameWidth: 2, target: box(0, 300, 1300, 50), viewport })
    ).toMatchObject({ left: 1140 });
  });
});

describe("boxOfTarget", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("measures a wrapper without height of its own by the fill image it holds", () => {
    const wrapper = document.createElement("div");
    wrapper.getBoundingClientRect = () => domRect(40, 300, 392, 0);
    const picture = document.createElement("picture");
    picture.getBoundingClientRect = () => domRect(0, 0, 0, 0);
    const image = document.createElement("img");
    image.getBoundingClientRect = () => domRect(40, 300, 392, 260);
    picture.append(image);
    wrapper.append(picture);
    document.body.append(wrapper);

    expect(boxOfTarget(wrapper)).toMatchObject({ height: 260, left: 40, top: 300, width: 392 });
  });

  it("keeps the box of a target that has one", () => {
    const heading = document.createElement("h2");
    heading.getBoundingClientRect = () => domRect(10, 20, 300, 40);

    expect(boxOfTarget(heading)).toMatchObject({ height: 40, width: 300 });
  });
});

describe("the edit badge", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("is not clipped with the frame and moves out from under a sticky header", () => {
    const cover = document.createElement("header");
    cover.setAttribute(DATA_VE_COVER_ATTR, "");
    cover.getBoundingClientRect = () => domRect(0, 0, 1024, 80);
    const target = document.createElement("h2");
    target.getBoundingClientRect = () => domRect(40, 90, 600, 200);
    document.body.append(cover, target);

    const editBadge = createEditBadge();
    editBadge.show(target, { clickHandler: () => undefined, href: "/admin" });

    const label = editBadge.labelElement;
    const frame = label.previousElementSibling as HTMLElement;
    expect(frame.style.clipPath).toContain("evenodd");
    expect(label.parentElement?.style.clipPath).toBe("");
    expect(label.style.transform).toMatch(/^translate\(.+px, 88px\)$/u);
    editBadge.dispose();
  });
});
