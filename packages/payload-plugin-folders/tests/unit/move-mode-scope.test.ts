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

vi.mock("@payloadcms/ui", () => ({ useModal: () => ({ modalState: {} }) }));

const home = pageRow(1, "Home");
const state: TreeStoreState = stateOf({ root: [home] });

const apis: { tab: MoveModeApi | null; view: MoveModeApi | null } = { tab: null, view: null };

const Probe = ({ isCompact, selected }: { isCompact: boolean; selected: readonly TreeItem[] }) => {
  const api = useMoveMode({ isBusy: false, isCompact, selectedItems: selected, state });
  apis[isCompact ? "tab" : "view"] = api;

  return null;
};

let roots: Root[] = [];
let container: HTMLElement | null = null;

const rowIn = (workspaceId: string): HTMLElement =>
  (container as HTMLElement).querySelector<HTMLElement>(
    `#${workspaceId} [data-testid="tree-row"]`
  ) as HTMLElement;

const press = async (target: Element, key: string) => {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }));
  });
};

/** Mounts the tab's hook first, so its document listener is the first one that hears a key. */
const mountBoth = async () => {
  container = document.createElement("div");
  container.innerHTML = `
    <div class="fr-folders" id="view"><div data-testid="tree-row" tabindex="-1"></div></div>
    <div class="fr-folders fr-folders--compact" id="tab"><div data-testid="tree-row" tabindex="-1"></div></div>
  `;
  document.body.append(container);
  for (const isCompact of [true, false]) {
    const root = createRoot(document.createElement("div"));
    roots.push(root);
    await act(async () => {
      root.render(createElement(Probe, { isCompact, selected: [home] }));
    });
  }
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  apis.tab = null;
  apis.view = null;
});

afterEach(async () => {
  for (const root of roots) {
    await act(async () => root.unmount());
  }
  roots = [];
  container?.remove();
  container = null;
});

describe("useMoveMode with the tree view and the sidebar tab on one page", () => {
  it("M pressed in the tree view starts Move mode there, though the tab listened first", async () => {
    await mountBoth();

    await press(rowIn("view"), "m");

    expect(apis.view?.active).toBe(true);
    expect(apis.tab?.active).toBe(false);
  });

  it("M pressed in the tab starts Move mode in the tab only", async () => {
    await mountBoth();

    await press(rowIn("tab"), "m");

    expect(apis.tab?.active).toBe(true);
    expect(apis.view?.active).toBe(false);
  });

  it("Escape pressed in the other workspace leaves Move mode where it is", async () => {
    await mountBoth();
    await press(rowIn("view"), "m");
    expect(apis.view?.active).toBe(true);

    await press(rowIn("tab"), "Escape");
    expect(apis.view?.active).toBe(true);

    await press(rowIn("view"), "Escape");
    expect(apis.view?.active).toBe(false);
  });
});
