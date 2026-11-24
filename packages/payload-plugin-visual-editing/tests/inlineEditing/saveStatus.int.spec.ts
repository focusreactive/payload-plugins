import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SaveStatus } from "../../src/client/inlineEditing/saveStatus";

import {
  createSaveStatus,
  DATA_VE_SAVE_STATUS_ATTR,
  SAVED_SHOWN_MS,
} from "../../src/client/inlineEditing/saveStatus";

const host = () => document.querySelector<HTMLElement>(`[${DATA_VE_SAVE_STATUS_ATTR}]`);

const label = () => host()?.shadowRoot?.querySelector("span")?.textContent;

const retryButton = () => host()?.shadowRoot?.querySelector("button");

describe("the save status", () => {
  let saveStatus: SaveStatus;
  const onRetry = vi.fn();
  const onReload = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    onRetry.mockClear();
    onReload.mockClear();
    saveStatus = createSaveStatus(document, onRetry, onReload);
  });

  afterEach(() => {
    saveStatus.remove();
    vi.useRealTimers();
  });

  it("is not on the page until there is something to say", () => {
    expect(host()).toBeNull();
  });

  it.each([
    ["unsaved", "Unsaved changes"],
    ["saving", "Saving…"],
    ["saved", "Saved"],
    ["failed", "Not saved"],
  ] as const)("says %s in words", (status, words) => {
    saveStatus.show(status);

    expect(label()).toBe(words);
  });

  it.each([
    ["locked", "Locked by another editor"],
    ["no-drafts", "This content has no drafts"],
    ["not-editable", "This field cannot be edited here"],
    ["signed-out", "Sign in to the admin to edit"],
    ["unreadable", "Not saved"],
    ["failed", "Not saved"],
  ] as const)("says why a save was refused: %s", (refusal, words) => {
    saveStatus.show("failed", refusal);

    expect(label()).toBe(words);
    expect(retryButton()?.hidden).toBe(false);
  });

  it("asks to reload the page when the field was changed elsewhere, and does not try again", () => {
    saveStatus.show("failed", "changed");

    expect(label()).toBe("Changed elsewhere, reload the page");
    expect(retryButton()?.textContent).toBe("Reload");
    retryButton()?.click();

    expect(onReload).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("offers to try again once a failure of another kind follows", () => {
    saveStatus.show("failed", "changed");
    saveStatus.show("failed", "locked");

    retryButton()?.click();

    expect(retryButton()?.textContent).toBe("Retry");
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onReload).not.toHaveBeenCalled();
  });

  it("says a reason only for a save that failed", () => {
    saveStatus.show("unsaved", "locked");

    expect(label()).toBe("Unsaved changes");
  });

  it("leaves the page a moment after a save", () => {
    saveStatus.show("saved");

    vi.advanceTimersByTime(SAVED_SHOWN_MS);

    expect(host()).toBeNull();
  });

  it("stays when the editor types again before it left", () => {
    saveStatus.show("saved");
    saveStatus.show("unsaved");

    vi.advanceTimersByTime(SAVED_SHOWN_MS);

    expect(label()).toBe("Unsaved changes");
  });

  it("offers to try again only after a failure", () => {
    saveStatus.show("saving");
    expect(retryButton()?.hidden).toBe(true);

    saveStatus.show("failed");
    retryButton()?.click();

    expect(retryButton()?.hidden).toBe(false);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("keeps its markup and styles out of the page", () => {
    saveStatus.show("unsaved");

    expect(document.querySelector("style, button")).toBeNull();
  });
});
