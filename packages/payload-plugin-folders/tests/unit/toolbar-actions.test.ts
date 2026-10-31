import { describe, expect, it } from "vitest";

import { toolbarStateOf } from "../../src/admin/Toolbar/toolbarActions.js";
import type { TreeItem } from "../../src/types.js";

const allowed = { delete: true, publish: true, update: true };

const item = (
  overrides: Partial<TreeItem> & Pick<TreeItem, "id" | "kind" | "title">
): TreeItem => ({
  access: allowed,
  collection: overrides.kind === "folder" ? "folders" : "pages",
  depth: 0,
  fullPath: `/${overrides.title.toLowerCase()}`,
  orderKey: null,
  parentId: null,
  slug: overrides.title.toLowerCase(),
  slugIsFallback: false,
  structureRevision: 0,
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("toolbarStateOf", () => {
  const page = item({ id: 1, kind: "page", title: "Page" });
  const folder = item({ id: 2, kind: "folder", title: "Folder" });

  it("offers every action when every row allows it", () => {
    const states = toolbarStateOf([page, folder]);

    for (const state of Object.values(states)) {
      expect(state.disabledBecause).toBeNull();
    }
  });

  it("shows Settings for exactly one item, whether a page or a folder", () => {
    expect(toolbarStateOf([page]).settings.visible).toBe(true);
    expect(toolbarStateOf([folder]).settings.visible).toBe(true);
    expect(toolbarStateOf([page, folder]).settings.visible).toBe(false);
  });

  it("turns Publish and Unpublish off when one row cannot publish, and nothing else", () => {
    const drafterPage = item({
      access: { delete: true, publish: false, update: true },
      id: 3,
      kind: "page",
      title: "Mine",
    });

    const states = toolbarStateOf([page, drafterPage]);

    expect(states.publish.disabledBecause).toBe("access");
    expect(states.unpublish.disabledBecause).toBe("access");
    expect(states.moveTo.disabledBecause).toBeNull();
    expect(states.delete.disabledBecause).toBeNull();
  });

  it("follows each flag: update for moving, duplicating and settings, delete for Delete", () => {
    const readOnly = item({
      access: { delete: false, publish: false, update: false },
      id: 4,
      kind: "page",
      title: "Locked",
    });

    const states = toolbarStateOf([readOnly]);

    for (const action of ["move", "moveTo", "duplicate", "settings"] as const) {
      expect(states[action].disabledBecause).toBe("access");
    }
    expect(states.delete.disabledBecause).toBe("access");
    expect(states.publish.disabledBecause).toBe("access");
  });
});
