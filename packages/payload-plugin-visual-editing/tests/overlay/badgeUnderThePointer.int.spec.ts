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
import { holds } from "../../src/client/overlay/targetsAtPoint";
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
    if (over !== under) {
      under.dispatchEvent(
        new MouseEvent("mouseleave", { clientX: x, clientY: y, relatedTarget: over })
      );
      over.dispatchEvent(
        new MouseEvent("mouseenter", { clientX: x, clientY: y, relatedTarget: under })
      );
    }
    over.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: x, clientY: y }));
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

    movePointer(caption, { x: 320, y: 60 });

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

  describe("of a wide line of text under a heading", () => {
    const TRIP_STEPS = 20;
    const LINE_TOP = 400;
    let heading: HTMLElement;
    let line: HTMLElement;
    let label: DOMRect;
    let lineRect: DOMRect;
    let headingRect: DOMRect;

    const elementAt = (point: Point): Element => {
      if (holds(label, point)) return editLabel();
      if (holds(lineRect, point)) return line;
      if (holds(headingRect, point)) return heading;
      return document.body;
    };

    const labelCenter = () => ({
      x: label.left + label.width / 2,
      y: label.top + label.height / 2,
    });

    const tripAlong = (from: Point, bow: number, steps: number, onStep?: () => void) => {
      const to = labelCenter();
      for (let step = 0; step <= steps; step += 1) {
        const along = step / TRIP_STEPS;
        const point = {
          x: from.x + (to.x - from.x) * along,
          y: from.y + (to.y - from.y) * along + bow * Math.sin(Math.PI * along),
        };
        movePointer(elementAt(point), point);
        onStep?.();
      }
    };

    const layOut = (width: number) => {
      removeEditTargets();
      tracker.dispose();
      heading = marked("h2", "heading");
      heading.textContent = "Heading";
      line = marked("p", "line");
      line.textContent = "Line";
      headingRect = new DOMRect(100, LINE_TOP - 60, width, 56);
      lineRect = new DOMRect(100, LINE_TOP, width, 24);
      label = new DOMRect(100 + width - 50, LINE_TOP - 24, 52, 24);
      drawnAt(heading, headingRect);
      drawnAt(line, lineRect);
      tracker = createFieldTracker(document.body);
      removeEditTargets = createEditTargets(document.body, tracker, () => ({
        ...overlayCtx({ mode: "hover" }),
        actionOf: () => null,
        mode: "hover",
      }));
      drawnAt(editLabel(), label);
      drawnAt(actionButton(), new DOMRect(0, 0, 0, 0));
    };

    it.each([
      [480, -30],
      [480, 30],
      [640, -30],
      [640, 30],
    ])(
      "stays on the line %ipx wide while the pointer bows %ipx off the straight way to the label",
      (width, bow) => {
        layOut(width);
        movePointer(line, { x: 110, y: LINE_TOP + 12 });
        const badgeFor: (string | null)[] = [];

        tripAlong({ x: 110, y: LINE_TOP + 12 }, bow, TRIP_STEPS, () =>
          badgeFor.push(isBadgeShown() ? badgeIsFor() : null)
        );
        vi.advanceTimersByTime(1000);

        expect(new Set(badgeFor)).toEqual(new Set(["line"]));
        expect(isBadgeShown()).toBe(true);
        expect(badgeIsFor()).toBe("line");
      }
    );

    it("moves to the heading when the pointer rests on it on the way to the label", () => {
      layOut(560);
      movePointer(line, { x: 110, y: LINE_TOP + 12 });
      tripAlong({ x: 110, y: LINE_TOP + 12 }, -30, TRIP_STEPS / 2);
      expect(badgeIsFor()).toBe("line");

      vi.advanceTimersByTime(CLEAR_GRACE_MS);

      expect(badgeIsFor()).toBe("heading");
    });

    it("moves to the heading when the pointer goes up into it, away from the label", () => {
      layOut(560);
      movePointer(line, { x: 110, y: LINE_TOP + 12 });

      movePointer(heading, { x: 112, y: LINE_TOP - 10 });
      movePointer(heading, { x: 114, y: LINE_TOP - 30 });

      expect(badgeIsFor()).toBe("heading");
    });
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
