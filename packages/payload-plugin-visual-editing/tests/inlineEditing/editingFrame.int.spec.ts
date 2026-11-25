import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DATA_VE_EDITING_FRAME_ATTR,
  showEditingFrame,
} from "../../src/client/inlineEditing/editingFrame";

import { zoomEveryElement, zoomNoElement } from "../support/zoom";

const PAGE_ZOOM = 1.25;

const frame = () => document.querySelector<HTMLElement>(`[${DATA_VE_EDITING_FRAME_ATTR}]`);

const placementOf = (shown: HTMLElement) => [
  shown.style.transform,
  shown.style.width,
  shown.style.height,
];

describe("the frame of an edit", () => {
  let edited: HTMLElement;
  let hideFrame: () => void;

  beforeEach(() => {
    document.body.innerHTML = "";
    edited = document.createElement("div");
    document.body.append(edited);
    vi.spyOn(edited, "getBoundingClientRect").mockReturnValue(new DOMRect(500, 250, 400, 200));
  });

  afterEach(() => {
    hideFrame();
    zoomNoElement();
    vi.restoreAllMocks();
  });

  it("lies just outside the edited element", () => {
    hideFrame = showEditingFrame(edited);

    expect(placementOf(frame() as HTMLElement)).toEqual([
      "translate(498px, 248px)",
      "404px",
      "204px",
    ]);
  });

  it("lies just outside the edited element on a page the site zoomed", () => {
    zoomEveryElement(PAGE_ZOOM);

    hideFrame = showEditingFrame(edited);

    expect(placementOf(frame() as HTMLElement)).toEqual([
      "translate(398px, 198px)",
      "324px",
      "164px",
    ]);
  });

  it("is removed when the edit ends", () => {
    hideFrame = showEditingFrame(edited);

    hideFrame();

    expect(frame()).toBeNull();
  });
});
