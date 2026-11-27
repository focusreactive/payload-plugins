import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BadgeAction } from "../../src/client/overlay/editBadge";
import type { FieldTracker } from "../../src/client/overlay/fieldTracker";

import { DATA_VE_ACTION_ATTR, LABEL_CLASS } from "../../src/client/overlay/constants";
import { createEditTargets } from "../../src/client/overlay/editTargets";
import { createFieldTracker } from "../../src/client/overlay/fieldTracker";
import { DATA_VE_COLLECTION_ATTR, DATA_VE_PATH_ATTR } from "../../src/shared/protocol";

import { click, overlayCtx } from "../support/overlay";
import { restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";
import { waitFor } from "../support/time";
import { zoomEveryElement, zoomNoElement } from "../support/zoom";

const CLEAR_GRACE_MS = 250;

const actionButton = () =>
  document.querySelector<HTMLButtonElement>(`[${DATA_VE_ACTION_ATTR}]`) as HTMLButtonElement;

const editLabel = () => document.querySelector<HTMLElement>(`.${LABEL_CLASS}`) as HTMLElement;

// The action sits in the active frame; the Edit label is the frame's sibling (so the clip under a
// sticky header never hides it). Both live in the overlay layer, which is what shows them.
const layerOf = (element: HTMLElement) => element.closest<HTMLElement>("[data-ve-layer]");

const isShown = (element: HTMLElement) =>
  element.style.display !== "none" && layerOf(element)?.style.visibility === "visible";

const frameOf = (button: HTMLElement) => button.parentElement as HTMLElement;

const pointerOver = (element: Element) => element.dispatchEvent(new MouseEvent("mouseenter"));

const pointerMoves = (from: Element, to: Element | null) =>
  from.dispatchEvent(new MouseEvent("mouseleave", { relatedTarget: to }));

describe("the action the overlay offers for a target", () => {
  let main: HTMLElement;
  let photo: HTMLElement;
  let caption: HTMLElement;
  let tracker: FieldTracker;
  let removeEditTargets: () => void;
  let postToAdmin: ReturnType<typeof vi.fn>;
  const run = vi.fn();
  const replacePhoto: BadgeAction = { label: "Replace image", run };

  const marked = (tag: string, path: string) => {
    const element = document.createElement(tag);
    element.setAttribute(DATA_VE_PATH_ATTR, path);
    element.setAttribute(DATA_VE_COLLECTION_ATTR, "page");
    main.append(element);
    return element;
  };

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    document.body.append(main);
    photo = marked("img", "image");
    caption = marked("p", "caption");
    postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });
    tracker = createFieldTracker(main);
    removeEditTargets = createEditTargets(main, tracker, () => ({
      ...overlayCtx({ mode: "hover" }),
      actionOf: (target) => (target === photo ? replacePhoto : null),
      mode: "hover",
    }));
  });

  afterEach(() => {
    removeEditTargets();
    tracker.dispose();
    restorePreviewWindow();
    run.mockClear();
  });

  it("is a button with its label, shown while the pointer is over the target", () => {
    pointerOver(photo);

    expect(isShown(actionButton())).toBe(true);
    expect(actionButton().textContent).toBe("Replace image");
    expect(actionButton().type).toBe("button");
  });

  describe("on an image larger than the window", () => {
    const placeImage = (left: number, top: number) =>
      vi
        .spyOn(photo, "getBoundingClientRect")
        .mockReturnValue(new DOMRect(left, top, window.innerWidth * 2, window.innerHeight * 3));

    it("sits at the top left corner of an image whose corner is in view", () => {
      placeImage(40, 60);

      pointerOver(photo);

      expect([actionButton().style.left, actionButton().style.top]).toEqual(["8px", "8px"]);
    });

    it("stays in the visible part of an image scrolled past its top and its left", () => {
      placeImage(-300, -500);

      pointerOver(photo);

      expect([actionButton().style.left, actionButton().style.top]).toEqual(["308px", "508px"]);
    });

    it("follows the page as it scrolls", () => {
      const placed = placeImage(40, 60);
      pointerOver(photo);

      placed.mockReturnValue(new DOMRect(40, -900, window.innerWidth * 2, window.innerHeight * 3));
      window.dispatchEvent(new Event("scroll"));

      expect(actionButton().style.top).toBe("908px");
    });
  });

  describe("on a page the site zoomed", () => {
    const PAGE_ZOOM = 1.25;

    const placePhoto = (rect: DOMRect) =>
      vi.spyOn(photo, "getBoundingClientRect").mockReturnValue(rect);

    beforeEach(() => zoomEveryElement(PAGE_ZOOM));

    afterEach(() => {
      zoomNoElement();
      vi.restoreAllMocks();
    });

    it("frames the target where it is drawn, not where the zoom would move the frame again", () => {
      placePhoto(new DOMRect(500, 250, 400, 200));

      pointerOver(photo);

      const frame = frameOf(actionButton());
      expect([frame.style.transform, frame.style.width, frame.style.height]).toEqual([
        "translate(398px, 198px)",
        "324px",
        "164px",
      ]);
    });

    it("keeps the button in the visible part of an image scrolled past its top and its left", () => {
      placePhoto(new DOMRect(-500, -250, window.innerWidth * 2, window.innerHeight * 3));

      pointerOver(photo);

      expect([actionButton().style.left, actionButton().style.top]).toEqual(["408px", "208px"]);
    });
  });

  it("lives in the layer of the overlay, not in the element of the page", () => {
    pointerOver(photo);

    expect(main.contains(actionButton())).toBe(false);
    expect(photo.childElementCount).toBe(0);
    expect(layerOf(actionButton())).not.toBeNull();
    expect(layerOf(actionButton())).toBe(layerOf(editLabel()));
  });

  it("is not shown for a target that offers none", () => {
    // A target without a box of its own gets no Edit label, so the caption needs one here.
    vi.spyOn(caption, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 20));
    pointerOver(caption);

    expect(isShown(editLabel())).toBe(true);
    expect(isShown(actionButton())).toBe(false);
  });

  it("goes when the pointer moves on to a target that offers none", () => {
    pointerOver(photo);
    pointerMoves(photo, caption);

    expect(isShown(actionButton())).toBe(false);
  });

  it("runs on a click and opens no field", () => {
    pointerOver(photo);

    const event = click(actionButton());

    expect(run).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(postToAdmin).not.toHaveBeenCalled();
  });

  it("hands the action a way to open the field after all", () => {
    run.mockImplementationOnce((openField: () => void) => openField());
    pointerOver(photo);

    click(actionButton());

    expect(postToAdmin).toHaveBeenCalledTimes(1);
  });

  it("leaves the click on the target itself to open the field", () => {
    pointerOver(photo);

    click(photo);

    expect(run).not.toHaveBeenCalled();
    expect(postToAdmin).toHaveBeenCalledTimes(1);
  });

  it("stays while the pointer moves from the target onto it and back", async () => {
    pointerOver(photo);
    pointerMoves(photo, actionButton());
    pointerOver(actionButton());
    await waitFor(CLEAR_GRACE_MS + 20);

    expect(isShown(actionButton())).toBe(true);

    pointerMoves(actionButton(), photo);
    await waitFor(CLEAR_GRACE_MS + 20);

    expect(isShown(actionButton())).toBe(true);
  });

  it("goes after the pointer left it for the page", async () => {
    pointerOver(photo);
    pointerMoves(photo, actionButton());
    pointerMoves(actionButton(), null);
    await waitFor(CLEAR_GRACE_MS + 20);

    expect(isShown(actionButton())).toBe(false);
  });

  it("is removed with the edit targets", () => {
    removeEditTargets();

    expect(document.querySelector(`[${DATA_VE_ACTION_ATTR}]`)).toBeNull();
  });
});
