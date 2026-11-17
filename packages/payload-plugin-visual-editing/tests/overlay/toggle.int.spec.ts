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

  it("leaves the page when it is removed", () => {
    toggle = createToggle(document, vi.fn());

    toggle.remove();

    expect(host()).toBeNull();
  });
});
