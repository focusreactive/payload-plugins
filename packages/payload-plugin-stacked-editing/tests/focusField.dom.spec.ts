import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { holdFocus } from "../src/lib/focusField.js";

describe("holdFocus", () => {
  let target: HTMLInputElement;
  let first: HTMLInputElement;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `<div class="drawer"><input id="first" /><input id="target" /></div>`;
    first = document.querySelector("#first") as HTMLInputElement;
    target = document.querySelector("#target") as HTMLInputElement;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("takes focus back when the drawer's focus trap moves it to the first field", () => {
    target.focus();
    const stop = holdFocus(target);

    first.focus();

    expect(document.activeElement).toBe(target);
    stop();
  });

  it("lets the editor move focus once they click or type", () => {
    target.focus();
    const stop = holdFocus(target);

    first.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    first.focus();

    expect(document.activeElement).toBe(first);
    stop();
  });

  it("stops holding after a moment", () => {
    target.focus();
    holdFocus(target, 1000);

    vi.advanceTimersByTime(1001);
    first.focus();

    expect(document.activeElement).toBe(first);
  });
});
