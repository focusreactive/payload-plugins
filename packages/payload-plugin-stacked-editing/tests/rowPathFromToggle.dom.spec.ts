import { describe, expect, it } from "vitest";

import {
  TOGGLE_SELECTOR,
  fieldPathOfHeaderAction,
  isOwnedBy,
  panelInputOfLabel,
  parentFieldPathOf,
  rowPathFromToggle,
} from "../src/lib/domPath.js";

const blocksField = (path: string, rowClass = "blocks-field__row") => `
  <div class="field-type blocks-field" id="field-${path.replaceAll(".", "__")}">
    <div class="blocks-field__rows">
      <div id="${path.split(".").join("-")}-row-0">
        <div class="collapsible ${rowClass} collapsible--collapsed">
          <div class="collapsible__toggle-wrap">
            <button class="collapsible__toggle" type="button"><span>Toggle</span></button>
            <div class="collapsible__header-wrap"><input id="block-name" /></div>
            <div class="collapsible__actions-wrap"><div class="collapsible__actions"><button class="menu">…</button></div></div>
          </div>
          <div class="collapsible__content"></div>
        </div>
      </div>
    </div>
  </div>`;

const toggleIn = (html: string) => {
  document.body.innerHTML = html;
  const toggle = document.querySelector(TOGGLE_SELECTOR);
  if (!toggle) {
    throw new Error("no toggle");
  }
  return toggle;
};

describe("rowPathFromToggle", () => {
  it("resolves a row toggle to its data path", () => {
    expect(rowPathFromToggle(toggleIn(blocksField("layout.0.nested")))).toBe("layout.0.nested.0");
  });

  it("works for array rows", () => {
    expect(rowPathFromToggle(toggleIn(blocksField("items", "array-field__row")))).toBe("items.0");
  });

  it("ignores collapsibles that are not array/blocks rows", () => {
    expect(rowPathFromToggle(toggleIn(blocksField("layout", "collapsible-field")))).toBeNull();
  });

  it("never matches the row actions or the block-name input", () => {
    document.body.innerHTML = blocksField("layout");
    expect(document.querySelector(".menu")?.closest(TOGGLE_SELECTOR)).toBeNull();
    expect(document.querySelector("#block-name")?.closest(TOGGLE_SELECTOR)).toBeNull();
  });
});

describe("ownership and labels", () => {
  globalThis.CSS ??= { escape: (value: string) => value } as typeof CSS;

  it("tells whose form or panel an element is in", () => {
    document.body.innerHTML = `
      <form data-stacked-editing-owner="me"><button id="mine"></button></form>
      <form><button id="other"></button></form>`;
    expect(isOwnedBy(document.querySelector("#mine")!, "me")).toBe(true);
    expect(isOwnedBy(document.querySelector("#other")!, "me")).toBe(false);
  });

  it("points a panel label at the panel's own input, not its hidden inline twin", () => {
    document.body.innerHTML = `
      <input id="title" />
      <div data-stacked-editing-owner="me"><label for="title">Title</label><input id="title" /></div>`;
    const panelInput = document.querySelectorAll("input")[1];
    expect(panelInputOfLabel(document.querySelector("label")!, "me")).toBe(panelInput);
    expect(panelInputOfLabel(document.querySelector("input")!, "me")).toBeNull();
  });

  it("finds the field of a header action and the field of a row", () => {
    document.body.innerHTML = `
      <div class="field-type" id="field-layout__0__items">
        <div class="array-field__header-actions"><button id="show-all"></button></div>
      </div>`;
    expect(fieldPathOfHeaderAction(document.querySelector("#show-all")!)).toBe("layout.0.items");
    expect(parentFieldPathOf("layout.0.items.3")).toBe("layout.0.items");
  });
});
