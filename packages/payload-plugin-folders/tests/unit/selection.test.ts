// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { useSelection } from "../../src/admin/useSelection.js";
import type { SelectionApi } from "../../src/admin/useSelection.js";
import type { TreeItem } from "../../src/types.js";

const allowed = { delete: true, publish: true, update: true };

const row = (id: number, kind: "folder" | "page" = "page"): TreeItem => ({
  access: allowed,
  collection: kind === "folder" ? "folders" : "pages",
  depth: 0,
  fullPath: `/row-${id}`,
  id,
  kind,
  orderKey: null,
  parentId: null,
  slug: `row-${id}`,
  slugIsFallback: false,
  structureRevision: 0,
  title: `Row ${id}`,
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const keysOf = (items: readonly TreeItem[]): string[] =>
  items.map((item) => `${item.collection}:${item.id}`);

/** Renders the hook for real and exposes its latest result; `rerender` swaps the loaded rows. */
const renderSelection = (initialRows: readonly TreeItem[]) => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root: Root = createRoot(container);
  const latest: { current: SelectionApi | null } = { current: null };
  const Probe = ({ rows }: { rows: readonly TreeItem[] }) => {
    latest.current = useSelection(rows);

    return null;
  };
  const rerender = async (rows: readonly TreeItem[]) => {
    await act(async () => {
      root.render(createElement(Probe, { rows }));
    });
  };

  return {
    current: (): SelectionApi => latest.current as SelectionApi,
    rerender,
    unmount: () => act(async () => root.unmount()),
    initial: () => rerender(initialRows),
  };
};

let unmount: (() => Promise<void>) | null = null;

afterEach(async () => {
  await unmount?.();
  unmount = null;
});

const mount = async (rows: readonly TreeItem[]) => {
  const rendered = renderSelection(rows);
  unmount = rendered.unmount;
  await rendered.initial();

  return rendered;
};

describe("useSelection", () => {
  const rows = [row(1), row(2), row(3, "folder"), row(4), row(5)];

  it("toggles a row on and off", async () => {
    const hook = await mount(rows);

    await act(async () => hook.current().toggle(rows[1] as TreeItem));
    expect(keysOf(hook.current().items)).toEqual(["pages:2"]);
    expect(hook.current().isSelected(rows[1] as TreeItem)).toBe(true);

    await act(async () => hook.current().toggle(rows[1] as TreeItem));
    expect(hook.current().items).toEqual([]);
  });

  it("keeps a page and a folder with the same id apart", async () => {
    const sameIdRows = [row(7, "page"), row(7, "folder")];
    const hook = await mount(sameIdRows);

    await act(async () => hook.current().toggle(sameIdRows[1] as TreeItem));

    expect(keysOf(hook.current().items)).toEqual(["folders:7"]);
  });

  it("returns the selected rows in screen order, not tick order", async () => {
    const hook = await mount(rows);

    await act(async () => hook.current().toggle(rows[4] as TreeItem));
    await act(async () => hook.current().toggle(rows[0] as TreeItem));

    expect(keysOf(hook.current().items)).toEqual(["pages:1", "pages:5"]);
  });

  it("selects a Shift click range from the last ticked row, both ends included", async () => {
    const hook = await mount(rows);

    await act(async () => hook.current().toggle(rows[1] as TreeItem));
    await act(async () => hook.current().selectRange(rows[3] as TreeItem));

    expect(keysOf(hook.current().items)).toEqual(["pages:2", "folders:3", "pages:4"]);
  });

  it("selects a range upwards too and keeps what was already ticked", async () => {
    const hook = await mount(rows);

    await act(async () => hook.current().toggle(rows[0] as TreeItem));
    await act(async () => hook.current().toggle(rows[4] as TreeItem));
    await act(async () => hook.current().selectRange(rows[2] as TreeItem));

    // The anchor is the last ticked row (5), so the range is 3 to 5; row 1 stays ticked.
    expect(keysOf(hook.current().items)).toEqual(["pages:1", "folders:3", "pages:4", "pages:5"]);
  });

  it("ticks only the clicked row when there is no anchor on screen", async () => {
    const hook = await mount(rows);

    await act(async () => hook.current().selectRange(rows[3] as TreeItem));

    expect(keysOf(hook.current().items)).toEqual(["pages:4"]);
  });

  it("makes the Shift click row the next anchor", async () => {
    const hook = await mount(rows);

    await act(async () => hook.current().toggle(rows[0] as TreeItem));
    await act(async () => hook.current().selectRange(rows[1] as TreeItem));
    await act(async () => hook.current().selectRange(rows[4] as TreeItem));

    expect(keysOf(hook.current().items)).toEqual([
      "pages:1",
      "pages:2",
      "folders:3",
      "pages:4",
      "pages:5",
    ]);
  });

  describe("the header checkbox", () => {
    it("selects every loaded row and nothing else", async () => {
      const hook = await mount(rows);

      await act(async () => hook.current().toggleAll());

      expect(keysOf(hook.current().items)).toEqual(keysOf(rows));
      expect(hook.current().headerState).toBe("all");
    });

    it("does not reach rows that are not loaded yet", async () => {
      const hook = await mount(rows);
      await act(async () => hook.current().toggleAll());

      // "Load more" brings two more rows: they are not selected, and the header shows it.
      const more = [...rows, row(6), row(7)];
      await hook.rerender(more);

      expect(keysOf(hook.current().items)).toEqual(keysOf(rows));
      expect(hook.current().headerState).toBe("some");

      await act(async () => hook.current().toggleAll());
      expect(keysOf(hook.current().items)).toEqual(keysOf(more));
    });

    it("clears the selection when every loaded row is already ticked", async () => {
      const hook = await mount(rows);
      await act(async () => hook.current().toggleAll());

      await act(async () => hook.current().toggleAll());

      expect(hook.current().items).toEqual([]);
      expect(hook.current().headerState).toBe("none");
    });

    it("shows a mixed state for a partial selection and completes it", async () => {
      const hook = await mount(rows);
      await act(async () => hook.current().toggle(rows[0] as TreeItem));

      expect(hook.current().headerState).toBe("some");

      await act(async () => hook.current().toggleAll());
      expect(keysOf(hook.current().items)).toEqual(keysOf(rows));
    });

    it("has nothing to select with no rows", async () => {
      const hook = await mount([]);

      await act(async () => hook.current().toggleAll());

      expect(hook.current().items).toEqual([]);
      expect(hook.current().headerState).toBe("none");
    });
  });

  it("drops a row that left the screen, and does not bring it back when it returns", async () => {
    const hook = await mount(rows);
    await act(async () => hook.current().toggleAll());

    // A folder closes: its two rows are gone from the loaded list.
    await hook.rerender([rows[0] as TreeItem, rows[1] as TreeItem, rows[2] as TreeItem]);
    expect(keysOf(hook.current().items)).toEqual(["pages:1", "pages:2", "folders:3"]);

    await hook.rerender(rows);
    expect(keysOf(hook.current().items)).toEqual(["pages:1", "pages:2", "folders:3"]);
  });

  it("puts a selection back exactly, as after a refused move, and ignores rows that are gone", async () => {
    const hook = await mount(rows);
    await act(async () => hook.current().toggle(rows[3] as TreeItem));

    await act(async () =>
      hook.current().select([rows[0] as TreeItem, row(99), rows[1] as TreeItem])
    );

    expect(keysOf(hook.current().items)).toEqual(["pages:1", "pages:2"]);
  });

  it("clears everything", async () => {
    const hook = await mount(rows);
    await act(async () => hook.current().toggleAll());

    await act(async () => hook.current().clear());

    expect(hook.current().items).toEqual([]);
    expect(hook.current().headerState).toBe("none");
  });
});
