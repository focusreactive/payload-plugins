import { describe, expect, it } from "vitest";

import { TOGGLE_SELECTOR, rowPathFromToggle } from "../src/lib/domPath.js";

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
