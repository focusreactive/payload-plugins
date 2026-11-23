import { beforeEach, describe, expect, it } from "vitest";

import { DATA_VE_TARGET_ATTR } from "../../src/client/overlay/constants";
import { areaOf, targetWithArea } from "../../src/client/overlay/targetArea";
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
