import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DATA_VE_TARGET_ATTR } from "../../src/client/overlay/constants";
import { areaOf, rectOf, targetWithArea } from "../../src/client/overlay/targetArea";
import { findTargetAncestor } from "../../src/client/overlay/targetSelector";

describe("the area of an edit target", () => {
  let main: HTMLElement;

  const targetIn = (markup: string): HTMLElement => {
    main.innerHTML = markup;
    const target = main.querySelector<HTMLElement>("[data-field]") as HTMLElement;
    target.setAttribute(DATA_VE_TARGET_ATTR, "title");
    return target;
  };

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    document.body.append(main);
  });

  it("is the block around a line of text that is all the block holds", () => {
    const target = targetIn(`<h1> <span data-field style="display:inline">Title</span> </h1>`);

    expect(areaOf(target)).toBe(main.querySelector("h1"));
  });

  it("is the target itself when the target is a block", () => {
    const target = targetIn(`<section><p data-field>Text</p></section>`);

    expect(areaOf(target)).toBe(target);
  });

  it("is the target itself when its parent holds anything else", () => {
    const target = targetIn(`<p><span data-field style="display:inline">Label</span> and more</p>`);

    expect(areaOf(target)).toBe(target);
  });

  it("never grows into another edit target", () => {
    const target = targetIn(
      `<a ${DATA_VE_TARGET_ATTR}="link"><span data-field style="display:inline">Label</span></a>`
    );

    expect(areaOf(target)).toBe(target);
  });

  it("gives a press anywhere in the block to the line of text it holds", () => {
    const target = targetIn(
      `<div><h1><span data-field style="display:inline">Title</span></h1></div>`
    );
    const heading = main.querySelector("h1") as HTMLElement;

    expect(targetWithArea(heading)).toBe(target);
    expect(findTargetAncestor(heading)).toBe(target);
    expect(findTargetAncestor(main.querySelector("div"))).toBeNull();
  });
});

const textDrawnAt = (...rects: DOMRect[]) =>
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value: () => rects,
  });

const boxOf = ({ height, left, top, width }: DOMRect) => [left, top, width, height];

describe("the rect of an edit target", () => {
  let main: HTMLElement;
  let title: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    title = document.createElement("h3");
    title.setAttribute(DATA_VE_TARGET_ATTR, "title");
    title.textContent = "A title longer than its card";
    main.append(title);
    document.body.append(main);
    vi.spyOn(title, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 20));
  });

  afterEach(() => {
    Reflect.deleteProperty(Range.prototype, "getClientRects");
    vi.restoreAllMocks();
  });

  it("holds the letters of a text drawn past its box", () => {
    textDrawnAt(new DOMRect(0, -5, 180, 30));

    expect(boxOf(rectOf(title))).toEqual([0, -5, 200, 30]);
  });

  it("leaves out the text that the target cuts off with an ellipsis", () => {
    title.style.overflowX = "hidden";
    textDrawnAt(new DOMRect(0, 0, 600, 20));

    expect(boxOf(rectOf(title))).toEqual([0, 0, 200, 20]);
  });

  it("leaves out the lines that a card around the target cuts off", () => {
    const card = document.createElement("article");
    card.style.overflowY = "hidden";
    title.replaceWith(card);
    card.append(title);
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 300, 40));
    textDrawnAt(
      new DOMRect(0, 0, 200, 20),
      new DOMRect(0, 20, 200, 20),
      new DOMRect(0, 40, 200, 20)
    );

    expect(boxOf(rectOf(title))).toEqual([0, 0, 200, 40]);
  });

  it("holds the letters of a text that an element inside the target draws past its box", () => {
    const words = document.createElement("span");
    words.textContent = "A title longer than its card";
    title.replaceChildren("\n  ", words, "\n");
    textDrawnAt(new DOMRect(0, -5, 180, 30));

    expect(boxOf(rectOf(title))).toEqual([0, -5, 200, 30]);
  });

  it("measures no text of a target that holds none of its own", () => {
    const getClientRects = vi.fn(() => [new DOMRect(0, 0, 900, 900)]);
    Object.defineProperty(Range.prototype, "getClientRects", {
      configurable: true,
      value: getClientRects,
    });
    title.replaceChildren(document.createElement("img"));

    expect(boxOf(rectOf(title))).toEqual([0, 0, 200, 20]);
    expect(getClientRects).not.toHaveBeenCalled();
  });
});
