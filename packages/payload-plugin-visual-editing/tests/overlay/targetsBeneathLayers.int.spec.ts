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

  describe("under controls of the page drawn over an image", () => {
    let figure: HTMLElement;

    const control = (element: HTMLElement) => {
      figure.append(element);
      return element;
    };

    beforeEach(() => {
      figure = document.createElement("figure");
      const image = marked("img", "hero.image");
      figure.append(image);
      main.append(figure);
      drawnAt(image, new DOMRect(0, 0, 400, 300));
      start();
    });

    it.each([
      ["a div that acts as a button", { role: "button" }],
      ["a div that acts as a link", { role: "link" }],
      ["a div that takes the focus", { tabindex: "0" }],
    ])("leaves a click on %s to the page", (_, attributes) => {
      const arrow = document.createElement("div");
      for (const [name, value] of Object.entries(attributes)) arrow.setAttribute(name, value);

      const event = click(control(arrow), AT);

      expect(open).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("leaves a click on a layer that draws an icon to the page", () => {
      const icon = document.createElement("div");
      icon.append(document.createElementNS("http://www.w3.org/2000/svg", "svg"));

      const event = click(control(icon), AT);

      expect(open).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("leaves a click on a video of the page to the page", () => {
      const event = click(control(document.createElement("video")), AT);

      expect(open).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    describe("such as a link over the whole card", () => {
      let link: HTMLAnchorElement;

      beforeEach(() => {
        link = document.createElement("a");
        link.href = "#project";
        link.textContent = "Read the case";
        control(link);
      });

      it("offers the action of the image while the pointer is over the link", () => {
        pointerMovesOver(link);

        expect(isBadgeShown()).toBe(true);
        expect(badgeIsFor()).toBe("hero.image");
        expect(actionButton().textContent).toBe("Replace image");
      });

      it("leaves a click on the link to the page", () => {
        pointerMovesOver(link);
        const event = click(link, AT);

        expect(open).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
      });
    });
  });

  describe("among targets drawn over each other", () => {
    let image: HTMLElement;
    let caption: HTMLElement;
    let layer: HTMLElement;

    beforeEach(() => {
      const figure = document.createElement("figure");
      image = marked("img", "hero.image");
      caption = marked("p", "hero.caption");
      caption.style.pointerEvents = "none";
      caption.textContent = "Caption";
      layer = document.createElement("div");
      figure.append(image, caption, layer);
      main.append(figure);
      drawnAt(image, new DOMRect(0, 0, 400, 300));
      drawnAt(caption, new DOMRect(0, 0, 400, 60));
    });

    afterEach(() => {
      Reflect.deleteProperty(document, "elementsFromPoint");
    });

    it("takes the one that comes later in the page", () => {
      start();

      pointerMovesOver(layer);

      expect(badgeIsFor()).toBe("hero.caption");
    });

    it("takes the one the browser paints on top", () => {
      Object.defineProperty(document, "elementsFromPoint", {
        configurable: true,
        value: () => [layer, image, caption],
      });
      start();

      pointerMovesOver(layer);

      expect(badgeIsFor()).toBe("hero.image");
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
