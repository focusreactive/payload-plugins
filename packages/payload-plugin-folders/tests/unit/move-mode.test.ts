// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMoveMode } from "../../src/admin/MoveMode/useMoveMode.js";
import type { MoveModeApi } from "../../src/admin/MoveMode/useMoveMode.js";
import type { TreeStoreState } from "../../src/admin/store.js";
import type { TreeItem } from "../../src/types.js";
import { pageRow, stateOf } from "../helpers/treeItems.js";

// The hook only reads which modals are open; Payload's provider is not needed for that.
const modals: { state: Record<string, { isOpen: boolean }> } = { state: {} };
vi.mock("@payloadcms/ui", () => ({ useModal: () => ({ modalState: modals.state }) }));

const home = pageRow(1, "Home");
const about = pageRow(2, "About");
const state: TreeStoreState = stateOf({ root: [home, about] });

let root: Root | null = null;
let container: HTMLElement | null = null;
let latest: MoveModeApi | null = null;

const Probe = ({ selected, isBusy }: { isBusy: boolean; selected: readonly TreeItem[] }) => {
  latest = useMoveMode({ isBusy, selectedItems: selected, state });

  return null;
};

/** Mounts the hook inside a container that also holds the tree row and the text field of a page. */
const mount = async ({
  isBusy = false,
  selected = [home],
}: { isBusy?: boolean; selected?: readonly TreeItem[] } = {}) => {
  container = document.createElement("div");
  container.innerHTML = `
    <input data-testid="search" type="text" />
    <input data-testid="tick" type="checkbox" />
    <button data-testid="toolbar-move" type="button">Move</button>
    <div data-testid="tree-row" data-collection="pages" data-item-id="1" tabindex="-1"></div>
  `;
  document.body.append(container);
  root = createRoot(document.createElement("div"));
  const mounted = root;
  await act(async () => {
    mounted.render(createElement(Probe, { isBusy, selected }));
  });
};

const element = (testId: string): HTMLElement =>
  (container as HTMLElement).querySelector<HTMLElement>(`[data-testid="${testId}"]`) as HTMLElement;

/** Presses a key on an element the way the browser sends it: from the target up to the document. */
const press = async (target: Element, key: string, init: KeyboardEventInit = {}) => {
  await act(async () => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key, ...init })
    );
  });
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  modals.state = {};
  latest = null;
});

afterEach(async () => {
  const mounted = root;
  root = null;
  if (mounted) {
    await act(async () => mounted.unmount());
  }
  container?.remove();
  container = null;
});

describe("useMoveMode, the key M", () => {
  it("starts Move mode for the ticked rows when pressed outside a text field", async () => {
    await mount();

    await press(element("tick"), "m");

    expect(latest?.active).toBe(true);
    expect(latest?.moving.map((item) => item.id)).toEqual([1]);
  });

  it("does not start it when the M is typed in a text field", async () => {
    await mount();

    await press(element("search"), "m");
    await press(element("search"), "M", { shiftKey: true });

    expect(latest?.active).toBe(false);
  });

  it("does not start it without a selection", async () => {
    await mount({ selected: [] });

    await press(element("tick"), "m");

    expect(latest?.active).toBe(false);
  });

  it("does not start it with a modifier held", async () => {
    await mount();

    await press(element("tick"), "m", { ctrlKey: true });
    await press(element("tick"), "m", { metaKey: true });

    expect(latest?.active).toBe(false);
  });

  it("does not start it while a dialog is open", async () => {
    modals.state = { "fr-folders-move-to": { isOpen: true } };
    await mount();

    await press(element("tick"), "m");

    expect(latest?.active).toBe(false);
  });

  it("does not start it while a move is in flight", async () => {
    await mount({ isBusy: true });

    await press(element("tick"), "m");

    expect(latest?.active).toBe(false);
  });
});

describe("useMoveMode, Escape and the focus", () => {
  it("leaves Move mode and gives the focus back to what had it", async () => {
    await mount();
    element("tick").focus();
    await press(element("tick"), "m");
    expect(latest?.active).toBe(true);
    // A marker took the focus meanwhile, as the real one does, and goes with the mode.
    const marker = document.createElement("button");
    marker.dataset.testid = "move-marker";
    (container as HTMLElement).append(marker);
    marker.focus();

    marker.remove();
    await press(document.body, "Escape");

    expect(latest?.active).toBe(false);
    expect(document.activeElement).toBe(element("tick"));
  });

  it("gives it to the first row that was moving when the element is gone", async () => {
    await mount();
    element("toolbar-move").focus();
    await act(async () => latest?.enter([home], true));
    expect(latest?.active).toBe(true);

    // The bar replaced the toolbar, so its Move button is gone when Move mode ends.
    element("toolbar-move").remove();
    await press(document.body, "Escape");

    expect(latest?.active).toBe(false);
    expect(document.activeElement).toBe(element("tree-row"));
  });

  it("leaves a focus the editor put elsewhere alone", async () => {
    await mount();
    element("tick").focus();
    await press(element("tick"), "m");
    element("search").focus();

    await act(async () => latest?.exit());

    expect(document.activeElement).toBe(element("search"));
  });
});
