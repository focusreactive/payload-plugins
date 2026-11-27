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

import { markedText } from "../support/markedData";
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

const textOfLinksDrawnAt = (rect: DOMRect) =>
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value(this: Range) {
      return this.startContainer.parentElement?.closest("a") ? [rect] : [];
    },
  });

const paintedFromTheTop = (...elements: HTMLElement[]) =>
  Object.defineProperty(document, "elementsFromPoint", {
    configurable: true,
    value: () => elements.filter((element) => getComputedStyle(element).pointerEvents !== "none"),
  });

const computedStyleOf = window.getComputedStyle.bind(window);

const NO_CONTENT = "none";

const pseudoElementsHold = (
  contentOf: (element: Element) => string,
  paintOf: (element: Element) => Partial<CSSStyleDeclaration> = () => ({})
) =>
  vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) =>
    pseudo
      ? ({
          backgroundColor: "rgba(0, 0, 0, 0)",
          backgroundImage: "none",
          boxShadow: "none",
          content: contentOf(element),
          getPropertyValue: () => "",
          maskImage: "none",
          ...paintOf(element),
        } as CSSStyleDeclaration)
      : computedStyleOf(element)
  );

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
    pseudoElementsHold(() => NO_CONTENT);
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
      textOfLinksDrawnAt(new DOMRect(0, 70, 100, 20));
      const event = click(link, { clientX: 50, clientY: 80 });
      Reflect.deleteProperty(Range.prototype, "getClientRects");

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

    afterEach(() => {
      Reflect.deleteProperty(Range.prototype, "getClientRects");
    });

    it.each([
      ["a div that acts as a button", { role: "button" }],
      ["a div that acts as a link", { role: "link" }],
      ["a div that takes the focus", { tabindex: "0" }],
    ])("opens the image beneath on a click on %s that draws nothing over it", (_, attributes) => {
      const arrow = document.createElement("div");
      for (const [name, value] of Object.entries(attributes)) arrow.setAttribute(name, value);

      const event = click(control(arrow), AT);

      expect(open).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it("leaves a click on a layer that draws an icon to the page", () => {
      const icon = document.createElement("div");
      icon.append(document.createElementNS("http://www.w3.org/2000/svg", "svg"));

      const event = click(control(icon), AT);

      expect(open).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("leaves a click on a video of the page to the page", () => {
      const video = document.createElement("video");
      drawnAt(video, new DOMRect(0, 0, 400, 300));
      const event = click(control(video), AT);

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
        textOfLinksDrawnAt(new DOMRect(0, 280, 100, 20));
      });

      afterEach(() => {
        Reflect.deleteProperty(Range.prototype, "getClientRects");
      });

      it("offers the action of the image while the pointer is over the link", () => {
        pointerMovesOver(link);

        expect(isBadgeShown()).toBe(true);
        expect(badgeIsFor()).toBe("hero.image");
        expect(actionButton().textContent).toBe("Replace image");
      });

      it("opens the image on a click on the link where the link draws nothing, so the page does not follow it", () => {
        pointerMovesOver(link);
        const event = click(link, AT);

        expect(open).toHaveBeenCalledTimes(1);
        expect(event.defaultPrevented).toBe(true);
      });

      it.each([
        ["where the browser puts no point", { clientX: 0, clientY: 0 }],
        ["over the image", AT],
      ])("leaves to the page a click the keyboard made on the link, %s", (_, at) => {
        link.focus();
        const event = click(link, { ...at, detail: 0 });

        expect(open).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
      });

      it("leaves a click on the text of the link to the page", () => {
        const onTheText = { clientX: 50, clientY: 290 };
        pointerMovesOver(link, onTheText);
        const event = click(link, onTheText);

        expect(open).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
      });
    });

    it("offers the action of the image over the line of a label the link holds for screen readers only", () => {
      const link = document.createElement("a");
      link.href = "#project";
      const label = document.createElement("span");
      label.textContent = "Read the case";
      Object.assign(label.style, {
        clip: "rect(0px, 0px, 0px, 0px)",
        height: "1px",
        overflowX: "hidden",
        overflowY: "hidden",
        position: "absolute",
        whiteSpace: "nowrap",
        width: "1px",
      });
      link.append(label);
      control(link);
      textOfLinksDrawnAt(new DOMRect(0, 0, 400, 60));

      pointerMovesOver(label);

      expect(isBadgeShown()).toBe(true);
      expect(badgeIsFor()).toBe("hero.image");
    });

    describe("such as an arrow of a carousel", () => {
      let arrow: HTMLButtonElement;

      beforeEach(() => {
        arrow = document.createElement("button");
        arrow.style.backgroundColor = "transparent";
        for (const side of ["top", "right", "bottom", "left"]) {
          arrow.style.setProperty(`border-${side}-width`, "0px");
        }
        control(arrow);
        drawnAt(arrow, new DOMRect(0, 0, 100, 60));
      });

      it.each([
        ["a background image", "background-image"],
        ["a mask image", "mask-image"],
      ])("shows nothing while the pointer is over an arrow drawn as %s", (_, property) => {
        arrow.style.setProperty(property, 'url("arrow.svg")');

        pointerMovesOver(arrow);

        expect(isBadgeShown()).toBe(false);
      });

      it("shows nothing while the pointer is over an arrow drawn by an icon font", () => {
        pseudoElementsHold((element) => (element === arrow ? '"\\e900"' : NO_CONTENT));

        pointerMovesOver(arrow);

        expect(isBadgeShown()).toBe(false);
      });

      it.each([
        ["a background colour", { backgroundColor: "rgb(255, 255, 255)" }],
        ["a half transparent background colour", { backgroundColor: "rgba(0, 0, 0, 0.5)" }],
        ["a shadow", { boxShadow: "rgb(0, 0, 0) 0px 2px 4px 0px" }],
      ])(
        "shows nothing and leaves a click to the page over an arrow whose empty pseudo-element paints %s",
        (_, paint) => {
          pseudoElementsHold(
            (element) => (element === arrow ? '""' : NO_CONTENT),
            (element) => (element === arrow ? paint : {})
          );

          pointerMovesOver(arrow);
          const event = click(arrow, AT);

          expect(isBadgeShown()).toBe(false);
          expect(event.defaultPrevented).toBe(false);
        }
      );

      it.each([
        ["a background colour", { backgroundColor: "rgba(20, 20, 20, 0.8)" }],
        [
          "a border",
          {
            borderTopColor: "rgb(255, 255, 255)",
            borderTopStyle: "solid",
            borderTopWidth: "2px",
          },
        ],
        ["a shadow", { boxShadow: "0 0 4px black" }],
      ])("leaves a click to the page over an arrow painted with %s", (_, paint) => {
        Object.assign(arrow.style, paint);

        pointerMovesOver(arrow);
        const event = click(arrow, AT);

        expect(isBadgeShown()).toBe(false);
        expect(event.defaultPrevented).toBe(false);
      });

      it("offers the image over an arrow whose background colour and border are transparent", () => {
        Object.assign(arrow.style, {
          backgroundColor: "transparent",
          borderTopColor: "transparent",
          borderTopStyle: "solid",
          borderTopWidth: "2px",
        });

        pointerMovesOver(arrow);

        expect(badgeIsFor()).toBe("hero.image");
      });

      it("offers the action of the image while the pointer is over a control whose pseudo-element holds no text", () => {
        pseudoElementsHold((element) => (element === arrow ? '""' : NO_CONTENT));

        pointerMovesOver(arrow);

        expect(isBadgeShown()).toBe(true);
        expect(badgeIsFor()).toBe("hero.image");
      });
    });

    it("offers the action of the image while the pointer is over an empty link stretched over the card", () => {
      const link = document.createElement("a");
      link.href = "#project";

      pointerMovesOver(control(link));

      expect(isBadgeShown()).toBe(true);
      expect(badgeIsFor()).toBe("hero.image");
    });

    describe("such as a link of a header over the image", () => {
      let link: HTMLAnchorElement;

      beforeEach(() => {
        link = document.createElement("a");
        link.href = "#home";
        control(link);
      });

      afterEach(() => {
        Reflect.deleteProperty(Range.prototype, "getClientRects");
      });

      it("shows nothing while the pointer is over the text of the link", () => {
        link.textContent = "Home";
        textOfLinksDrawnAt(new DOMRect(0, 0, 100, 60));

        pointerMovesOver(link);

        expect(isBadgeShown()).toBe(false);
      });

      it("shows nothing while the pointer is over the logo in the link", () => {
        const logo = document.createElement("img");
        link.append(logo);
        drawnAt(logo, new DOMRect(0, 0, 100, 60));

        pointerMovesOver(logo);

        expect(isBadgeShown()).toBe(false);
      });
    });
  });

  describe("under a link over the whole card that names it only for screen readers", () => {
    let link: HTMLAnchorElement;
    let hidden: HTMLElement;

    beforeEach(() => {
      const card = document.createElement("article");
      const image = marked("img", "card.image");
      link = document.createElement("a");
      link.href = "#project";
      hidden = document.createElement("span");
      hidden.textContent = markedText("A project", {
        collectionSlug: "page",
        docId: "1",
        kind: "collection",
        path: "card.title",
      });
      link.append(hidden);
      card.append(image, link);
      main.append(card);
      drawnAt(image, new DOMRect(0, 0, 400, 300));
      drawnAt(link, new DOMRect(0, 0, 400, 300));
    });

    afterEach(() => {
      Reflect.deleteProperty(Range.prototype, "getClientRects");
    });

    it.each([
      ["clips it away", { clip: "rect(0px, 0px, 0px, 0px)", position: "absolute" }],
      ["clips its path away", { clipPath: "inset(50%)" }],
      ["shows it with no opacity", { opacity: "0" }],
      ["hides it", { visibility: "hidden" }],
      ["gives it no font size", { fontSize: "0px" }],
      [
        "squeezes it into a pixel",
        { height: "1px", overflowX: "hidden", overflowY: "hidden", width: "1px" },
      ],
    ])("offers the image and opens it on a click on the link when the page %s", (_, style) => {
      Object.assign(hidden.style, style);
      drawnAt(hidden, new DOMRect(0, 0, 1, 1));
      start();

      pointerMovesOver(hidden);
      const event = click(hidden, AT);

      expect(badgeIsFor()).toBe("card.image");
      expect(actionButton().textContent).toBe("Replace image");
      expect(open).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it("offers the image when the letters of the text take no more than a pixel", () => {
      Object.defineProperty(Range.prototype, "getClientRects", {
        configurable: true,
        value: () => [new DOMRect(0, 0, 1, 1)],
      });
      start();

      pointerMovesOver(hidden);

      expect(badgeIsFor()).toBe("card.image");
    });

    it("edits the title the link shows", () => {
      start();

      link.dispatchEvent(new MouseEvent("mouseenter"));

      expect(badgeIsFor()).toBe("card.title");
    });

    it("edits the title when the page clips its path only from the top", () => {
      hidden.style.clipPath = "inset(50% 0 0 0)";
      start();

      link.dispatchEvent(new MouseEvent("mouseenter"));

      expect(badgeIsFor()).toBe("card.title");
    });

    it.each([
      ["fades it in", { opacity: "0" }, { opacity: "1" }],
      ["makes it visible", { visibility: "hidden" }, { visibility: "visible" }],
      ["reveals its clipped path", { clipPath: "inset(50%)" }, { clipPath: "none" }],
    ])("edits the title once the page %s after it was found", (_, before, after) => {
      Object.assign(hidden.style, before);
      start();
      Object.assign(hidden.style, after);

      link.dispatchEvent(new MouseEvent("mouseenter"));
      const event = click(hidden, AT);

      expect(badgeIsFor()).toBe("card.title");
      expect(open).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it("offers the image again once the page hides the title it showed", () => {
      start();
      hidden.style.opacity = "0";

      pointerMovesOver(hidden);
      const event = click(hidden, AT);

      expect(badgeIsFor()).toBe("card.image");
      expect(open).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe("with a heading the page reveals on scroll", () => {
    let heading: HTMLElement;

    beforeEach(() => {
      heading = document.createElement("h2");
      heading.style.opacity = "0";
      heading.textContent = markedText("Revealed", {
        collectionSlug: "page",
        docId: "1",
        kind: "collection",
        path: "hero.title",
      });
      main.append(heading);
      drawnAt(heading, new DOMRect(0, 0, 400, 60));
      start();
    });

    it("leaves a click to the page while the heading is not shown", () => {
      const event = click(heading, AT);

      expect(open).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("reads whether the heading is shown once in a frame, however often the pointer moves", () => {
      const layer = document.createElement("div");
      main.append(layer);
      heading.style.opacity = "1";
      const readsOfTheHeading = () =>
        vi.mocked(window.getComputedStyle).mock.calls.filter(([element]) => element === heading)
          .length;
      const before = readsOfTheHeading();
      pointerMovesOver(layer);
      const readsOfOneMove = readsOfTheHeading() - before;

      pointerMovesOver(layer, { clientX: 60, clientY: 30 });
      pointerMovesOver(layer, { clientX: 70, clientY: 30 });

      expect(badgeIsFor()).toBe("hero.title");
      expect(readsOfOneMove).toBeGreaterThan(0);
      expect(readsOfTheHeading() - before).toBe(readsOfOneMove);
    });

    it("edits the heading once it is shown", () => {
      heading.style.opacity = "1";

      heading.dispatchEvent(new MouseEvent("mouseenter"));
      click(heading, AT);

      expect(badgeIsFor()).toBe("hero.title");
      expect(open).toHaveBeenCalledTimes(1);
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
      caption.style.pointerEvents = "";
      paintedFromTheTop(layer, image, caption);
      start();

      pointerMovesOver(layer);

      expect(badgeIsFor()).toBe("hero.image");
    });

    it("takes the one the browser hits when the other is stacked alike and the browser finds no point of it", () => {
      paintedFromTheTop(layer, caption, image);
      start();

      pointerMovesOver(layer);

      expect(badgeIsFor()).toBe("hero.image");
    });

    it("takes the one that comes later in the page when the browser finds no point of either", () => {
      image.style.pointerEvents = "none";
      paintedFromTheTop(layer, caption, image);
      start();

      pointerMovesOver(layer);

      expect(badgeIsFor()).toBe("hero.caption");
    });

    it("takes the one stacked on top when the browser finds no point of it", () => {
      Object.assign(caption.style, { position: "relative", zIndex: "1" });
      image.before(caption);
      paintedFromTheTop(layer, caption, image);
      start();

      pointerMovesOver(layer);

      expect(badgeIsFor()).toBe("hero.caption");
    });

    it.each([
      ["mix-blend-mode", "multiply"],
      ["clip-path", "circle(50%)"],
      ["mask-image", "url(mask.png)"],
      ["container-type", "inline-size"],
    ])(
      "takes the one that %s stacks on top when the browser finds no point of it",
      (property, value) => {
        caption.style.setProperty(property, value);
        image.before(caption);
        paintedFromTheTop(layer, caption, image);
        start();

        pointerMovesOver(layer);

        expect(badgeIsFor()).toBe("hero.caption");
      }
    );

    it("takes the one inside a layer stacked on top, however deep in that layer it sits", () => {
      const raised = document.createElement("div");
      Object.assign(raised.style, { position: "absolute", zIndex: "10" });
      const holder = document.createElement("div");
      holder.style.position = "relative";
      image.before(raised);
      raised.append(holder);
      holder.append(image);
      image.style.pointerEvents = "none";
      Object.assign(caption.style, { pointerEvents: "", position: "relative", zIndex: "1" });
      paintedFromTheTop(layer, caption, image);
      start();

      pointerMovesOver(layer);

      expect(badgeIsFor()).toBe("hero.image");
    });
  });

  describe("in a card whose title spans an image beneath it with a short line of letters", () => {
    let title: HTMLElement;
    let image: HTMLElement;

    const ON_THE_LETTERS = { clientX: 40, clientY: 15 };
    const BESIDE_THE_LETTERS = { clientX: 300, clientY: 60 };
    const BELOW_THE_IMAGE = { clientX: 300, clientY: 400 };

    beforeEach(() => {
      const card = document.createElement("article");
      image = marked("img", "card.image");
      title = document.createElement("h3");
      title.textContent = markedText("Card", {
        collectionSlug: "page",
        docId: "1",
        kind: "collection",
        path: "card.title",
      });
      card.append(image, title);
      main.append(card);
      drawnAt(image, new DOMRect(0, 0, 400, 300));
      drawnAt(title, new DOMRect(0, 0, 400, 500));
      Object.defineProperty(Range.prototype, "getClientRects", {
        configurable: true,
        value(this: Range) {
          return title.contains(this.startContainer) ? [new DOMRect(0, 0, 80, 30)] : [];
        },
      });
      paintedFromTheTop(title, image);
      start();
    });

    afterEach(() => {
      Reflect.deleteProperty(Range.prototype, "getClientRects");
      Reflect.deleteProperty(document, "elementsFromPoint");
    });

    it("frames the image where the pointer is over the title beside its letters", () => {
      pointerMovesOver(title, BESIDE_THE_LETTERS);

      expect(badgeIsFor()).toBe("card.image");
      expect(actionButton().textContent).toBe("Replace image");
    });

    it("frames the title where the pointer is over its letters or a few pixels off them", () => {
      pointerMovesOver(title, ON_THE_LETTERS);

      expect(badgeIsFor()).toBe("card.title");

      pointerMovesOver(title, { clientX: 83, clientY: 32 });

      expect(badgeIsFor()).toBe("card.title");
    });

    it("keeps the image when the pointer enters the title beside its letters", () => {
      pointerMovesOver(title, BESIDE_THE_LETTERS);

      title.dispatchEvent(new MouseEvent("mouseenter", BESIDE_THE_LETTERS));

      expect(badgeIsFor()).toBe("card.image");
    });

    it("keeps the image when the pointer leaves it for the title beside its letters", () => {
      pointerMovesOver(image, { clientX: 300, clientY: 20 });

      image.dispatchEvent(
        new MouseEvent("mouseleave", { ...BESIDE_THE_LETTERS, relatedTarget: title })
      );

      expect(badgeIsFor()).toBe("card.image");
    });

    it("opens the image on a click on the title beside its letters, and the title on its letters", () => {
      removeEditTargets();
      tracker.dispose();
      tracker = createFieldTracker(main);
      removeEditTargets = createEditTargets(main, tracker, () => ({
        ...overlayCtx({ buildAdminEditUrl: ({ path }) => `/admin/edit?path=${path}` }),
        mode: "hover",
      }));

      click(title, BESIDE_THE_LETTERS);
      click(title, ON_THE_LETTERS);

      expect(open.mock.calls.map(([url]) => String(url).split("?")[1])).toEqual([
        "path=card.image",
        "path=card.title",
      ]);
    });

    it("frames the title beside its letters where nothing is drawn beneath it", () => {
      pointerMovesOver(title, BELOW_THE_IMAGE);

      expect(badgeIsFor()).toBe("card.title");
    });
  });

  describe("whose size changes while its frame shows", () => {
    let title: HTMLElement;
    let drawn: ReturnType<typeof drawnAt>;
    let resized: (() => void)[];
    let watched: Set<Element>;

    beforeEach(() => {
      resized = [];
      watched = new Set();
      vi.stubGlobal(
        "ResizeObserver",
        class {
          constructor(onResize: () => void) {
            resized.push(onResize);
          }
          observe = (element: Element) => watched.add(element);
          unobserve = (element: Element) => watched.delete(element);
          disconnect = () => watched.clear();
        }
      );
      title = marked("h1", "hero.title");
      title.textContent = "Hero";
      main.append(title);
      drawn = drawnAt(title, new DOMRect(0, 0, 400, 100));
      start();
    });

    afterEach(() => vi.unstubAllGlobals());

    it("measures the frame again", () => {
      pointerMovesOver(title);
      drawn.mockReturnValue(new DOMRect(0, 0, 400, 40));

      for (const onResize of resized) onResize();

      expect(editLabel().parentElement?.style.height).toBe(`${40 + 2 * 2}px`);
    });

    it("stops watching the very element it watched once the pointer leaves, also when the area of the target changed", () => {
      const block = document.createElement("div");
      const line = marked("span", "hero.line");
      line.style.display = "inline";
      line.textContent = "Line";
      block.append(line);
      main.append(block);
      drawnAt(block, new DOMRect(0, 200, 400, 40));
      removeEditTargets();
      tracker.dispose();
      start();
      pointerMovesOver(line, { clientX: 50, clientY: 210 });
      const watchedWhileOver = [...watched];
      block.append(document.createElement("img"));

      pointerMovesOver(main, { clientX: 500, clientY: 500 });
      vi.advanceTimersByTime(CLEAR_GRACE_MS);

      expect(watchedWhileOver).toContain(block);
      expect([...watched].filter((element) => element === block || element === line)).toEqual([]);
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
