import { afterEach, describe, expect, it, vi } from "vitest";

import type { Toggle } from "../../src/client/toggle";

import { DATA_VE_HOVERING_ATTR } from "../../src/client/overlay/constants";
import {
  createToggle,
  DATA_VE_TOGGLE_ATTR,
  TOGGLE_POSITION_STORAGE_KEY,
} from "../../src/client/toggle";
import { flushMutations } from "../support/time";
import { zoomEveryElement, zoomNoElement } from "../support/zoom";

const PAGE_ZOOM = 1.25;

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

  it("comes back where it was dropped on a page the site zoomed", () => {
    zoomEveryElement(PAGE_ZOOM);
    localStorage.setItem(TOGGLE_POSITION_STORAGE_KEY, JSON.stringify({ right: 50, top: 75 }));

    toggle = createToggle(document, vi.fn());

    expect([host()?.style.right, host()?.style.top]).toEqual(["40px", "60px"]);
    localStorage.removeItem(TOGGLE_POSITION_STORAGE_KEY);
    zoomNoElement();
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
});
