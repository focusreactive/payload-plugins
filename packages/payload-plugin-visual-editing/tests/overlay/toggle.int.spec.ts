import { afterEach, describe, expect, it, vi } from "vitest";

import type { Toggle } from "../../src/client/toggle";

import { DATA_VE_HOVERING_ATTR } from "../../src/client/overlay/constants";
import {
  createToggle,
  DATA_VE_TOGGLE_ATTR,
  TOGGLE_POSITION_STORAGE_KEY,
} from "../../src/client/toggle";
import { declarationsFor } from "../support/shadowStyles";
import { flushMutations } from "../support/time";

const host = () => document.querySelector<HTMLElement>(`[${DATA_VE_TOGGLE_ATTR}]`);

const buttons = () => [...(host()?.shadowRoot?.querySelectorAll("button") ?? [])];

const checkedLabels = () =>
  buttons()
    .filter((button) => button.getAttribute("aria-checked") === "true")
    .map((button) => button.textContent);

describe("toggle", () => {
  let toggle: Toggle | null = null;

  afterEach(() => {
    toggle?.remove();
    toggle = null;
    document.body.removeAttribute(DATA_VE_HOVERING_ATTR);
  });

  it("offers every mode and marks the one it shows", () => {
    toggle = createToggle(document, vi.fn());

    toggle.show("hover");

    expect(buttons().map((button) => button.textContent)).toEqual(["Off", "Hover", "Always"]);
    expect(checkedLabels()).toEqual(["Hover"]);
  });

  it("reports the mode the editor picks", () => {
    const onSelect = vi.fn();
    toggle = createToggle(document, onSelect);

    buttons()[2]?.click();

    expect(onSelect).toHaveBeenCalledWith("always");
  });

  it("keeps its markup and styles out of the page", () => {
    toggle = createToggle(document, vi.fn());

    expect(document.querySelector("style, button")).toBeNull();
    expect(host()?.shadowRoot?.querySelector("style")).not.toBeNull();
  });

  it("steps aside while the editor hovers editable text", async () => {
    toggle = createToggle(document, vi.fn());

    document.body.setAttribute(DATA_VE_HOVERING_ATTR, "true");
    await flushMutations();
    expect(host()?.hasAttribute("data-hidden")).toBe(true);

    document.body.removeAttribute(DATA_VE_HOVERING_ATTR);
    await flushMutations();
    expect(host()?.hasAttribute("data-hidden")).toBe(false);
  });

  describe("as a radio group on the keyboard", () => {
    const tabStops = () =>
      buttons()
        .filter((button) => button.tabIndex === 0)
        .map((button) => button.textContent);

    const focusedLabel = () => host()?.shadowRoot?.activeElement?.textContent;

    const pressOn = (label: string, key: string) => {
      const button = buttons().find(({ textContent }) => textContent === label);
      button?.focus();
      const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key });
      button?.dispatchEvent(event);
      return event;
    };

    const showingWhatIsPicked = () => {
      const onSelect = vi.fn((mode) => toggle?.show(mode));
      toggle = createToggle(document, onSelect);
      toggle.show("hover");
      return onSelect;
    };

    it("is one tab stop, on the mode it shows", () => {
      toggle = createToggle(document, vi.fn());

      toggle.show("always");
      expect(tabStops()).toEqual(["Always"]);

      toggle.show("off");
      expect(tabStops()).toEqual(["Off"]);
    });

    it.each([
      ["ArrowRight", "Always", "always"],
      ["ArrowDown", "Always", "always"],
      ["ArrowLeft", "Off", "off"],
      ["ArrowUp", "Off", "off"],
      ["Home", "Off", "off"],
      ["End", "Always", "always"],
    ])("moves to and picks the mode %s leads to", (key, label, mode) => {
      const onSelect = showingWhatIsPicked();

      const event = pressOn("Hover", key);

      expect(onSelect).toHaveBeenCalledWith(mode);
      expect(focusedLabel()).toBe(label);
      expect(tabStops()).toEqual([label]);
      expect(event.defaultPrevented).toBe(true);
    });

    it("goes round from the last mode to the first and back", () => {
      const onSelect = showingWhatIsPicked();

      pressOn("Always", "ArrowRight");
      expect(onSelect).toHaveBeenLastCalledWith("off");
      expect(focusedLabel()).toBe("Off");

      pressOn("Off", "ArrowLeft");
      expect(onSelect).toHaveBeenLastCalledWith("always");
      expect(focusedLabel()).toBe("Always");
    });

    it("leaves every other key to the page", () => {
      const onSelect = showingWhatIsPicked();

      const event = pressOn("Always", "Tab");

      expect(onSelect).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });
  });

  it("starts in the top right corner and comes back where it was dropped", () => {
    toggle = createToggle(document, vi.fn());
    expect(host()?.style.top).toBe("");
    toggle.remove();

    localStorage.setItem(TOGGLE_POSITION_STORAGE_KEY, JSON.stringify({ right: 40, top: 60 }));
    toggle = createToggle(document, vi.fn());

    expect(host()?.style.top).toBe("60px");
    expect(host()?.style.right).toBe("40px");
    localStorage.removeItem(TOGGLE_POSITION_STORAGE_KEY);
  });

  it("lights its dot while visual editing is on", () => {
    toggle = createToggle(document, vi.fn());

    toggle.show("off");
    expect(host()?.hasAttribute("data-on")).toBe(false);

    toggle.show("hover");
    expect(host()?.hasAttribute("data-on")).toBe(true);
  });

  it("leaves the page when it is removed", () => {
    toggle = createToggle(document, vi.fn());

    toggle.remove();

    expect(host()).toBeNull();
  });
  describe("the switch of editing on the page", () => {
    const editsInPlaceSwitch = () =>
      host()?.shadowRoot?.querySelector<HTMLButtonElement>('[role="switch"]') ?? null;

    it("is not there unless the site offers editing on the page", () => {
      toggle = createToggle(document, vi.fn(), vi.fn());

      toggle.show("hover");

      expect(editsInPlaceSwitch()).toBeNull();
    });

    it("shows whether the editor turned editing on the page on", () => {
      toggle = createToggle(document, vi.fn(), vi.fn());

      toggle.show("hover", false);
      expect(editsInPlaceSwitch()?.getAttribute("aria-checked")).toBe("false");

      toggle.show("hover", true);
      expect(editsInPlaceSwitch()?.getAttribute("aria-checked")).toBe("true");
    });

    it("reports the opposite of what it shows when the editor clicks it", () => {
      const onEditsInPlace = vi.fn();
      toggle = createToggle(document, vi.fn(), onEditsInPlace);
      toggle.show("hover", false);

      editsInPlaceSwitch()?.click();
      toggle.show("hover", true);
      editsInPlaceSwitch()?.click();

      expect(onEditsInPlace.mock.calls).toEqual([[true], [false]]);
    });

    it("picks no mode when the editor clicks it", () => {
      const onSelect = vi.fn();
      toggle = createToggle(document, onSelect, vi.fn());
      toggle.show("hover", false);

      editsInPlaceSwitch()?.click();

      expect(onSelect).not.toHaveBeenCalled();
    });

    it("leaves when the site stops offering editing on the page", () => {
      toggle = createToggle(document, vi.fn(), vi.fn());
      toggle.show("hover", true);

      toggle.show("hover");

      expect(editsInPlaceSwitch()).toBeNull();
    });

    it("moves to a row of its own where the window is too narrow for one row", () => {
      toggle = createToggle(document, vi.fn(), vi.fn());
      toggle.show("hover", true);

      const card = declarationsFor(host(), ".card");

      expect(card).toContain("flex-wrap: wrap");
      expect(card).toContain("max-width: calc(100vw - 24px)");
    });

    it("shows that it is on by a dot in the accent colour, and keeps the colour of its text", () => {
      toggle = createToggle(document, vi.fn(), vi.fn());
      toggle.show("hover", true);

      const whenOn = declarationsFor(host(), '[role="switch"][aria-checked="true"]');
      const dotWhenOn = declarationsFor(host(), '[role="switch"][aria-checked="true"]::before');

      expect(whenOn.filter((declaration) => declaration.startsWith("color:"))).toEqual([]);
      expect(dotWhenOn).toContain("background: var(--ve-on)");
    });

    it("stays out of the arrow keys of the modes", () => {
      const onSelect = vi.fn();
      toggle = createToggle(document, onSelect, vi.fn());
      toggle.show("hover", true);

      editsInPlaceSwitch()?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" })
      );

      expect(onSelect).not.toHaveBeenCalled();
    });
  });
});
