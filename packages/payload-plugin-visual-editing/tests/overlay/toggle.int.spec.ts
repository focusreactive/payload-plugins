import { afterEach, describe, expect, it, vi } from "vitest";

import type { Toggle } from "../../src/client/toggle";

import { DATA_VE_HOVERING_ATTR } from "../../src/client/overlay/constants";
import { createToggle, DATA_VE_TOGGLE_ATTR } from "../../src/client/toggle";
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

    expect(buttons().map((button) => button.textContent)).toEqual(["Off", "Always", "Hover"]);
    expect(checkedLabels()).toEqual(["Hover"]);
  });

  it("reports the mode the editor picks", () => {
    const onSelect = vi.fn();
    toggle = createToggle(document, onSelect);

    buttons()[1]?.click();

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
      toggle.show("always");
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
      ["ArrowRight", "Hover", "hover"],
      ["ArrowDown", "Hover", "hover"],
      ["ArrowLeft", "Off", "off"],
      ["ArrowUp", "Off", "off"],
      ["Home", "Off", "off"],
      ["End", "Hover", "hover"],
    ])("moves to and picks the mode %s leads to", (key, label, mode) => {
      const onSelect = showingWhatIsPicked();

      const event = pressOn("Always", key);

      expect(onSelect).toHaveBeenCalledWith(mode);
      expect(focusedLabel()).toBe(label);
      expect(tabStops()).toEqual([label]);
      expect(event.defaultPrevented).toBe(true);
    });

    it("goes round from the last mode to the first and back", () => {
      const onSelect = showingWhatIsPicked();

      pressOn("Hover", "ArrowRight");
      expect(onSelect).toHaveBeenLastCalledWith("off");
      expect(focusedLabel()).toBe("Off");

      pressOn("Off", "ArrowLeft");
      expect(onSelect).toHaveBeenLastCalledWith("hover");
      expect(focusedLabel()).toBe("Hover");
    });

    it("leaves every other key to the page", () => {
      const onSelect = showingWhatIsPicked();

      const event = pressOn("Always", "Tab");

      expect(onSelect).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });
  });

  it("leaves the page when it is removed", () => {
    toggle = createToggle(document, vi.fn());

    toggle.remove();

    expect(host()).toBeNull();
  });
});
