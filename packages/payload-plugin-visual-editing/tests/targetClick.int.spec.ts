import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OverlayCtx } from "../src/client/overlay/createOverlay";

import { createOverlay } from "../src/client/overlay/createOverlay";
import { DATA_VE_COLLECTION_ATTR, DATA_VE_DOC_ID_ATTR, DATA_VE_PATH_ATTR } from "../src/constants";

const buildAdminEditUrl = vi.fn(({ path }: { path: string }) => `/admin/edit?path=${path}`);

const ctx: OverlayCtx = {
  buildAdminEditUrl,
  adminOrigin: "https://admin.example.com",
  adminBasePath: "/admin",
  mode: "hover",
};

const click = (el: Element, init: MouseEventInit = {}): MouseEvent => {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
  el.dispatchEvent(event);
  return event;
};

describe("click on a highlighted target", () => {
  let main: HTMLElement;
  let anchor: HTMLAnchorElement;
  let label: HTMLSpanElement;
  let anchorClick: ReturnType<typeof vi.fn>;
  let open: ReturnType<typeof vi.spyOn>;
  let dispose: () => void;

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    anchor = document.createElement("a");
    anchor.href = "#pricing";
    anchor.setAttribute(DATA_VE_PATH_ATTR, "hero.0.actions.0.label");
    anchor.setAttribute(DATA_VE_COLLECTION_ATTR, "page");
    anchor.setAttribute(DATA_VE_DOC_ID_ATTR, "1");
    label = document.createElement("span");
    label.textContent = "Start free";
    anchor.append(label);
    main.append(anchor);
    document.body.append(main);

    anchorClick = vi.fn();
    anchor.addEventListener("click", anchorClick);
    open = vi.spyOn(window, "open").mockImplementation(() => null);
    dispose = createOverlay(main, () => ctx);
  });

  afterEach(() => {
    dispose();
    open.mockRestore();
    document.getSelection()?.removeAllRanges();
  });

  it("opens the field instead of following the link", () => {
    const event = click(label);

    expect(open).toHaveBeenCalledWith("/admin/edit?path=hero.0.actions.0.label", "_blank");
    expect(event.defaultPrevented).toBe(true);
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it("lets a modifier click through to the page", () => {
    const event = click(label, { metaKey: true });

    expect(open).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    expect(anchorClick).toHaveBeenCalledTimes(1);
  });

  it("lets a non-primary button click through to the page", () => {
    const event = click(label, { button: 1 });

    expect(open).not.toHaveBeenCalled();
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });

  it("lets a click that ends a text selection through to the page", () => {
    document.getSelection()?.selectAllChildren(label);

    const event = click(label);

    expect(open).not.toHaveBeenCalled();
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores clicks outside any target", () => {
    const outside = document.createElement("p");
    main.append(outside);

    click(outside);

    expect(open).not.toHaveBeenCalled();
  });

  it("stops intercepting after dispose", () => {
    dispose();

    click(label);

    expect(open).not.toHaveBeenCalled();
    expect(anchorClick).toHaveBeenCalledTimes(1);
  });
});
