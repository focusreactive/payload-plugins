import type { MockInstance } from "vitest";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BadgeAction } from "../../src/client/overlay/editBadge";
import type { FieldTracker } from "../../src/client/overlay/fieldTracker";

import {
  DATA_VE_ACTION_ATTR,
  DATA_VE_FOR_ATTR,
  LABEL_CLASS,
} from "../../src/client/overlay/constants";
import { createEditTargets } from "../../src/client/overlay/editTargets";
import { createFieldTracker } from "../../src/client/overlay/fieldTracker";
import { DATA_VE_COLLECTION_ATTR, DATA_VE_PATH_ATTR } from "../../src/shared/protocol";

import { click, overlayCtx } from "../support/overlay";

const CLEAR_GRACE_MS = 250;

const editLabel = () => document.querySelector<HTMLElement>(`.${LABEL_CLASS}`) as HTMLElement;

const actionButton = () =>
  document.querySelector<HTMLButtonElement>(`[${DATA_VE_ACTION_ATTR}]`) as HTMLButtonElement;

const isBadgeShown = () => editLabel().parentElement?.parentElement?.style.visibility === "visible";

const badgeIsFor = () => editLabel().getAttribute(DATA_VE_FOR_ATTR);

const AT = { clientX: 50, clientY: 30 };

const pointerMovesOver = (element: Element, at: MouseEventInit = AT) =>
  element.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, ...at }));

const drawnAt = (element: Element, rect: DOMRect) =>
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(rect);

describe("a target beneath a layer that takes the pointer", () => {
  let main: HTMLElement;
  let tracker: FieldTracker;
  let removeEditTargets: () => void;
  let open: MockInstance<typeof window.open>;
  const replace: BadgeAction = { label: "Replace image", run: vi.fn() };

  const marked = (tag: string, path: string) => {
    const element = document.createElement(tag);
    element.setAttribute(DATA_VE_PATH_ATTR, path);
    element.setAttribute(DATA_VE_COLLECTION_ATTR, "page");
    return element;
  };

  const start = () => {
    tracker = createFieldTracker(main);
    removeEditTargets = createEditTargets(main, tracker, () => ({
      ...overlayCtx({ mode: "hover" }),
      actionOf: (target) => (target.tagName === "IMG" ? replace : null),
      mode: "hover",
    }));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    main = document.createElement("main");
    document.body.append(main);
    open = vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    removeEditTargets();
    tracker.dispose();
    open.mockRestore();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("in a container that lets the pointer through to the background", () => {
    let background: HTMLElement;
    let title: HTMLElement;
    let link: HTMLAnchorElement;

    beforeEach(() => {
      const section = document.createElement("section");
      background = document.createElement("div");
      const container = document.createElement("div");
      container.style.pointerEvents = "none";
      title = marked("h1", "hero.title");
      title.textContent = "Hero";
      link = document.createElement("a");
      link.href = "#contact";
      link.textContent = "Contact";
      container.append(title, link);
      section.append(background, container);
      main.append(section);
      drawnAt(title, new DOMRect(0, 0, 400, 60));
      drawnAt(link, new DOMRect(0, 70, 100, 20));
      start();
    });

    it("frames the target the pointer is over", () => {
      pointerMovesOver(background);

      expect(isBadgeShown()).toBe(true);
      expect(badgeIsFor()).toBe("hero.title");
    });

    it("hides the frame once the pointer left the target", () => {
      pointerMovesOver(background);

      pointerMovesOver(background, { clientX: 50, clientY: 200 });
      vi.advanceTimersByTime(CLEAR_GRACE_MS);

      expect(isBadgeShown()).toBe(false);
    });

    it("opens the field on a click", () => {
      const event = click(background, AT);

      expect(open).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it("leaves a click on a link of the page to the page", () => {
      const event = click(link, AT);

      expect(open).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("leaves a click on other content of the page drawn over the target to the page", () => {
      const header = document.createElement("header");
      header.textContent = "Sticky header";
      main.append(header);

      const event = click(header, AT);

      expect(open).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe("under a layer drawn over an image", () => {
    beforeEach(() => {
      const figure = document.createElement("figure");
      const image = marked("img", "hero.image");
      const layer = document.createElement("div");
      figure.append(image, layer);
      main.append(figure);
      drawnAt(image, new DOMRect(0, 0, 400, 300));
      start();
    });

    it("offers the action of the image", () => {
      pointerMovesOver(main.querySelector("figure > div") as HTMLElement);

      expect(badgeIsFor()).toBe("hero.image");
      expect(actionButton().textContent).toBe("Replace image");
    });
  });

  describe("in a card that cuts off the text of its title", () => {
    let card: HTMLElement;

    beforeEach(() => {
      card = document.createElement("article");
      card.style.overflowX = "hidden";
      const title = marked("h3", "card.title");
      title.textContent = "A title much longer than the card";
      card.append(title);
      main.append(card);
      drawnAt(card, new DOMRect(0, 0, 200, 100));
      drawnAt(title, new DOMRect(0, 0, 200, 20));
      Object.defineProperty(Range.prototype, "getClientRects", {
        configurable: true,
        value: () => [new DOMRect(0, 0, 900, 20)],
      });
      start();
    });

    afterEach(() => {
      Reflect.deleteProperty(Range.prototype, "getClientRects");
    });

    it("opens the title on a click on its letters", () => {
      click(card, { clientX: 150, clientY: 10 });

      expect(open).toHaveBeenCalledTimes(1);
    });

    it("leaves a click beside the card, where the cut off text would be, to the page", () => {
      const beside = document.createElement("div");
      main.append(beside);

      const event = click(beside, { clientX: 500, clientY: 10 });

      expect(open).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });
  });
});
