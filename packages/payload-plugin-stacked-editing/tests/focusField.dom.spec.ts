import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OWNER_ATTRIBUTE, PANEL_BODY_CLASS } from "../src/lib/constants.js";
import { focusFieldInTopPanel } from "../src/lib/focusField.js";

const panel = (fields: string) =>
  `<div class="${PANEL_BODY_CLASS}" ${OWNER_ATTRIBUTE}="owner">${fields}</div>`;

const inputOf = (id: string) => document.querySelector<HTMLInputElement>(`#${id}`) as HTMLElement;

describe("focusFieldInTopPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();
    globalThis.CSS ??= { escape: (value: string) => value } as typeof CSS;
    document.body.innerHTML = panel(
      `<input id="field-hero__0__variant" />${panel(
        `<input id="field-hero__0__actions__0__url" /><input id="field-hero__0__actions__0__label" /><input id="field-hero__0__actions__0__appearance" />`
      )}`
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("focuses the field of the path in the top panel", () => {
    focusFieldInTopPanel({ depth: 2, ownerId: "owner", path: "hero.0.actions.0.label" });
    vi.advanceTimersByTime(60);

    expect(document.activeElement).toBe(inputOf("field-hero__0__actions__0__label"));
  });

  it("takes the focus back from the first field a panel that just opened focuses", () => {
    focusFieldInTopPanel({ depth: 2, ownerId: "owner", path: "hero.0.actions.0.label" });
    vi.advanceTimersByTime(60);
    inputOf("field-hero__0__variant").focus();
    inputOf("field-hero__0__actions__0__appearance").focus();
    vi.advanceTimersByTime(400);

    expect(document.activeElement).toBe(inputOf("field-hero__0__actions__0__label"));
  });

  it("leaves the focus where it went outside the panels", () => {
    const search = document.createElement("input");
    document.body.append(search);
    focusFieldInTopPanel({ depth: 2, ownerId: "owner", path: "hero.0.actions.0.label" });
    vi.advanceTimersByTime(60);
    search.focus();
    vi.advanceTimersByTime(400);

    expect(document.activeElement).toBe(search);
  });
});
