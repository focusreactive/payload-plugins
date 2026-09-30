import { beforeEach, describe, expect, it } from "vitest";

import { findTargetAncestor, pickTargetForGroup } from "../src/client/overlay/targetSelector";

describe("pickTargetForGroup", () => {
  let boundary: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    boundary = document.createElement("main");
    document.body.append(boundary);
  });

  it("returns the nearest <a> when every node lives inside it", () => {
    boundary.innerHTML = `<a href="#"><span>click me</span></a>`;
    const anchor = boundary.querySelector("a")!;
    const textNode = anchor.querySelector("span")!.firstChild as Text;

    expect(pickTargetForGroup([textNode], boundary)).toBe(anchor);
  });

  it("returns the nearest <button> when every node lives inside it", () => {
    boundary.innerHTML = `<button><strong>Go</strong></button>`;
    const button = boundary.querySelector("button")!;
    const textNode = button.querySelector("strong")!.firstChild as Text;

    expect(pickTargetForGroup([textNode], boundary)).toBe(button);
  });

  it("falls back to the lowest common ancestor when nodes span siblings", () => {
    boundary.innerHTML = `<section><div><span id="a">A</span></div><div><span id="b">B</span></div></section>`;
    const a = boundary.querySelector("#a")!.firstChild as Text;
    const b = boundary.querySelector("#b")!.firstChild as Text;

    const picked = pickTargetForGroup([a, b], boundary);
    expect(picked?.tagName).toBe("SECTION");
  });

  it("expands a <label>-contained group to the shared field container when the control is a sibling", () => {
    boundary.innerHTML = `
			<div class="field">
				<input id="first-name" />
				<label for="first-name">First name</label>
			</div>
		`;
    const label = boundary.querySelector("label")!;
    const textNode = label.firstChild as Text;

    const picked = pickTargetForGroup([textNode], boundary);
    expect(picked?.classList.contains("field")).toBe(true);
  });
});

describe("findTargetAncestor", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns null when no ancestor has the target attribute", () => {
    const el = document.createElement("span");
    document.body.append(el);
    expect(findTargetAncestor(el)).toBeNull();
  });

  it("returns the nearest ancestor carrying data-ve-target", () => {
    document.body.innerHTML = `<section data-ve-target="body"><div><span id="leaf">x</span></div></section>`;
    const leaf = document.querySelector("#leaf")!;
    const section = document.querySelector("section")!;
    expect(findTargetAncestor(leaf)).toBe(section);
  });
});
