import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DATA_VE_COVER_ATTR } from "../../src/client/overlay/covers";
import { placeFrame } from "../../src/client/overlay/frameLayer";

const rect = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

const placedAt = (element: Element, box: DOMRect) => {
  element.getBoundingClientRect = () => box;
};

describe("covers of the page", () => {
  let header: HTMLElement;
  let section: HTMLElement;
  let frame: HTMLElement;

  beforeEach(() => {
    header = document.createElement("header");
    header.setAttribute(DATA_VE_COVER_ATTR, "");
    placedAt(header, rect(0, 0, 1024, 80));

    section = document.createElement("section");
    placedAt(section, rect(40, 50, 600, 200));

    frame = document.createElement("div");
    document.body.append(header, section, frame);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("hides the part of a frame that lies under a cover", () => {
    placeFrame(frame, section, 2);

    expect(frame.style.clipPath).toContain("evenodd");
    expect(frame.style.clipPath).toContain("-38px -48px, 986px -48px, 986px 32px, -38px 32px");
  });

  it("leaves a frame whole when no cover overlaps the page", () => {
    header.removeAttribute(DATA_VE_COVER_ATTR);

    placeFrame(frame, section, 2);

    expect(frame.style.clipPath).toBe("");
  });

  it("keeps the content of the cover itself editable", () => {
    const logo = document.createElement("span");
    header.append(logo);
    placedAt(logo, rect(16, 16, 120, 40));

    placeFrame(frame, logo, 2);

    expect(frame.style.clipPath).toBe("");
  });

  it("ignores a cover that is not rendered", () => {
    placedAt(header, rect(0, 0, 0, 0));

    placeFrame(frame, section, 2);

    expect(frame.style.clipPath).toBe("");
  });
});
