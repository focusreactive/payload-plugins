import type { MockInstance } from "vitest";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BadgeAction } from "../../src/client/overlay/editBadge";
import type { FieldTracker } from "../../src/client/overlay/fieldTracker";

import {
  DATA_VE_ACTION_ATTR,
  DATA_VE_FOR_ATTR,
  DATA_VE_LAYER_ATTR,
  LABEL_CLASS,
} from "../../src/client/overlay/constants";
import { createEditTargets } from "../../src/client/overlay/editTargets";
import { createFieldTracker } from "../../src/client/overlay/fieldTracker";
import { DATA_VE_COLLECTION_ATTR, DATA_VE_PATH_ATTR } from "../../src/shared/protocol";

import { click, overlayCtx } from "../support/overlay";

const CLEAR_GRACE_MS = 250;
const MOVE_EVERY_MS = 50;

type Point = { x: number; y: number };

const editLabel = () => document.querySelector<HTMLElement>(`.${LABEL_CLASS}`) as HTMLElement;

const actionButton = () =>
  document.querySelector<HTMLButtonElement>(`[${DATA_VE_ACTION_ATTR}]`) as HTMLButtonElement;

const isBadgeShown = () => editLabel().parentElement?.parentElement?.style.visibility === "visible";

const badgeIsFor = () => editLabel().getAttribute(DATA_VE_FOR_ATTR);

const drawnAt = (element: Element, rect: DOMRect) =>
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(rect);

describe("the badge of a target on a page whose overlay root is the body", () => {
  let photo: HTMLElement;
  let caption: HTMLElement;
  let tracker: FieldTracker;
  let removeEditTargets: () => void;
  let open: MockInstance<typeof window.open>;
  let under: Element;
  const run = vi.fn();
  const replacePhoto: BadgeAction = { label: "Replace image", run };

  const marked = (tag: string, path: string) => {
    const element = document.createElement(tag);
    element.setAttribute(DATA_VE_PATH_ATTR, path);
    element.setAttribute(DATA_VE_COLLECTION_ATTR, "page");
    document.body.append(element);
    return element;
  };

  const movePointer = (over: Element, { x, y }: Point) => {
    over.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: x, clientY: y }));
    if (over !== under) {
      under.dispatchEvent(
        new MouseEvent("mouseleave", { clientX: x, clientY: y, relatedTarget: over })
      );
      over.dispatchEvent(
        new MouseEvent("mouseenter", { clientX: x, clientY: y, relatedTarget: under })
      );
    }
    under = over;
    vi.advanceTimersByTime(MOVE_EVERY_MS);
  };

  const jitterFor = (ms: number, over: readonly Element[], at: Point) => {
    for (let step = 0; step * MOVE_EVERY_MS < ms; step += 1) {
      movePointer(over[step % over.length] as Element, { x: at.x + (step % 3), y: at.y });
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    under = document.body;
    open = vi.spyOn(window, "open").mockImplementation(() => null);
    caption = marked("p", "caption");
    caption.textContent = "Caption";
    photo = marked("img", "image");
    drawnAt(caption, new DOMRect(300, 50, 200, 46));
    drawnAt(photo, new DOMRect(100, 100, 300, 200));
    tracker = createFieldTracker(document.body);
    removeEditTargets = createEditTargets(document.body, tracker, () => ({
      ...overlayCtx({ mode: "hover" }),
      actionOf: (target) => (target === photo ? replacePhoto : null),
      mode: "hover",
    }));
    drawnAt(editLabel(), new DOMRect(350, 70, 52, 24));
    drawnAt(actionButton(), new DOMRect(108, 108, 100, 24));
  });

  afterEach(() => {
    removeEditTargets();
    tracker.dispose();
    open.mockRestore();
    run.mockClear();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("stays while the pointer moves over the Edit label for a second", () => {
    movePointer(photo, { x: 380, y: 110 });
    movePointer(editLabel(), { x: 370, y: 80 });

    jitterFor(1000, [editLabel(), editLabel().querySelector("span") as Element], { x: 370, y: 80 });

    expect(isBadgeShown()).toBe(true);
    expect(badgeIsFor()).toBe("image");
  });

  it("stays while the pointer moves over the Replace image button for a second", () => {
    movePointer(photo, { x: 300, y: 200 });
    movePointer(actionButton(), { x: 150, y: 120 });

    jitterFor(1000, [actionButton()], { x: 150, y: 120 });

    expect(isBadgeShown()).toBe(true);
    expect(actionButton().textContent).toBe("Replace image");
  });

  it("stays when the pointer comes back onto the label before the grace runs out", () => {
    movePointer(photo, { x: 380, y: 110 });
    movePointer(document.body, { x: 20, y: 400 });

    movePointer(editLabel(), { x: 370, y: 80 });
    vi.advanceTimersByTime(CLEAR_GRACE_MS * 2);

    expect(isBadgeShown()).toBe(true);
  });

  it("stays on its target while the pointer slowly crosses the gap to the label", () => {
    movePointer(photo, { x: 390, y: 110 });

    for (const y of [99, 98, 97]) {
      movePointer(document.body, { x: 390, y });
      vi.advanceTimersByTime(CLEAR_GRACE_MS - MOVE_EVERY_MS - 10);
    }
    movePointer(editLabel(), { x: 390, y: 90 });
    vi.advanceTimersByTime(1000);

    expect(isBadgeShown()).toBe(true);
    expect(badgeIsFor()).toBe("image");
  });

  it("stays on its target while the pointer crosses another target on the way to the label", () => {
    movePointer(photo, { x: 390, y: 110 });

    movePointer(caption, { x: 391, y: 95 });
    expect(badgeIsFor()).toBe("image");

    movePointer(caption, { x: 392, y: 92 });
    movePointer(editLabel(), { x: 392, y: 85 });
    vi.advanceTimersByTime(1000);

    expect(isBadgeShown()).toBe(true);
    expect(badgeIsFor()).toBe("image");
  });

  it("moves to the other target when the pointer turns away from the label", () => {
    movePointer(photo, { x: 390, y: 110 });
    movePointer(caption, { x: 391, y: 95 });

    movePointer(caption, { x: 310, y: 60 });

    expect(badgeIsFor()).toBe("caption");
  });

  it("moves to the other target when the pointer stops on it on the way", () => {
    movePointer(photo, { x: 390, y: 110 });
    movePointer(caption, { x: 391, y: 95 });

    vi.advanceTimersByTime(CLEAR_GRACE_MS);

    expect(badgeIsFor()).toBe("caption");
  });

  it("moves to another target the pointer enters away from the label", () => {
    movePointer(photo, { x: 390, y: 110 });

    movePointer(caption, { x: 320, y: 90 });

    expect(badgeIsFor()).toBe("caption");
  });

  it("runs the action of the button clicked after the pointer reached it", () => {
    movePointer(photo, { x: 300, y: 200 });
    movePointer(actionButton(), { x: 150, y: 120 });
    jitterFor(600, [actionButton()], { x: 150, y: 120 });

    const event = click(actionButton(), { clientX: 150, clientY: 120 });

    expect(run).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("opens the field from the label clicked after the pointer reached it", () => {
    movePointer(photo, { x: 380, y: 110 });
    movePointer(editLabel(), { x: 370, y: 80 });
    jitterFor(600, [editLabel()], { x: 370, y: 80 });

    click(editLabel(), { clientX: 370, clientY: 80 });

    expect(open).toHaveBeenCalledTimes(1);
    expect(run).not.toHaveBeenCalled();
  });

  describe("under another layer of the overlay", () => {
    let status: HTMLElement;

    beforeEach(() => {
      status = document.createElement("div");
      status.setAttribute(DATA_VE_LAYER_ATTR, "status");
      document.body.append(status);
    });

    it("keeps the badge of the target beneath as it was", () => {
      movePointer(photo, { x: 300, y: 280 });

      movePointer(status, { x: 310, y: 290 });

      expect(badgeIsFor()).toBe("image");
    });

    it("leaves a click to the layer", () => {
      const event = click(status, { clientX: 310, clientY: 290 });

      expect(open).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });
  });
});
