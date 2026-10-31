import { describe, expect, it } from "vitest";

import {
  effectiveDefaultType,
  planFolderSettingsSave,
} from "../../src/admin/Settings/folderSettings.js";
import type { FolderSettingsValues } from "../../src/admin/Settings/folderSettings.js";
import { pageBodyOf, planPageSettingsSave } from "../../src/admin/Settings/pageSettings.js";
import type { PageSettingsValues } from "../../src/admin/Settings/pageSettings.js";

const storedPage: PageSettingsValues = {
  isFolderRoot: false,
  parentId: 5,
  segment: "contact",
  title: "Contact",
};

describe("planPageSettingsSave, a collection with drafts", () => {
  const plan = (edited: Partial<PageSettingsValues>, hasNewerDraft = false) =>
    planPageSettingsSave({
      edited: { ...storedPage, ...edited },
      hasDrafts: true,
      hasNewerDraft,
      stored: storedPage,
    });

  it("saves nothing when nothing changed", () => {
    expect(plan({})).toEqual([]);
  });

  it("saves a title and a segment as one draft edit that asks nothing", () => {
    expect(plan({ segment: "contact-us", title: "Contact us" })).toEqual([
      {
        changes: { segment: "contact-us", title: "Contact us" },
        kind: "content",
        mode: "draft",
        needsConfirm: false,
      },
    ]);
  });

  it("ticks root live, after the confirm, on a published page", () => {
    expect(plan({ isFolderRoot: true })).toEqual([
      { changes: { isFolderRoot: true }, kind: "content", mode: "live", needsConfirm: true },
    ]);
  });

  it("ticks root as part of the draft when the page has a newer draft, so nothing unreviewed goes live", () => {
    expect(plan({ isFolderRoot: true }, true)).toEqual([
      { changes: { isFolderRoot: true }, kind: "content", mode: "draft", needsConfirm: false },
    ]);
  });

  it("writes the live root flag before the draft edit, so the edit is not published along with it", () => {
    expect(plan({ isFolderRoot: true, title: "Contact us" })).toEqual([
      { changes: { isFolderRoot: true }, kind: "content", mode: "live", needsConfirm: true },
      { changes: { title: "Contact us" }, kind: "content", mode: "draft", needsConfirm: false },
    ]);
  });

  it("merges the root flag and a draft edit into one save when the page already has a newer draft", () => {
    expect(plan({ isFolderRoot: true, title: "Contact us" }, true)).toEqual([
      {
        changes: { isFolderRoot: true, title: "Contact us" },
        kind: "content",
        mode: "draft",
        needsConfirm: false,
      },
    ]);
  });

  it("unticks root live with the segment the dialog chose, and asks nothing more", () => {
    const stored = { ...storedPage, isFolderRoot: true };

    expect(
      planPageSettingsSave({
        edited: { ...stored, isFolderRoot: false, segment: "about-us" },
        hasDrafts: true,
        hasNewerDraft: false,
        stored,
      })
    ).toEqual([
      {
        changes: { isFolderRoot: false, segment: "about-us" },
        kind: "content",
        mode: "live",
        needsConfirm: false,
      },
    ]);
  });

  it("ignores an edited segment while the page stays a root page: its segment is not in its URL", () => {
    const stored = { ...storedPage, isFolderRoot: true };

    expect(
      planPageSettingsSave({
        edited: { ...stored, segment: "other" },
        hasDrafts: true,
        hasNewerDraft: false,
        stored,
      })
    ).toEqual([]);
  });

  it("moves last, with the move's own confirmation", () => {
    expect(plan({ parentId: 9, title: "Contact us" })).toEqual([
      {
        changes: { title: "Contact us" },
        kind: "content",
        mode: "draft",
        needsConfirm: false,
      },
      { kind: "move", toFolder: 9 },
    ]);
    expect(plan({ parentId: null })).toEqual([{ kind: "move", toFolder: null }]);
  });
});

describe("planPageSettingsSave, a collection without drafts", () => {
  const plan = (edited: Partial<PageSettingsValues>) =>
    planPageSettingsSave({
      edited: { ...storedPage, ...edited },
      hasDrafts: false,
      hasNewerDraft: false,
      stored: storedPage,
    });

  it("saves a new segment live, after the URL confirm, because every row of it is live", () => {
    expect(plan({ segment: "contact-us" })).toEqual([
      {
        changes: { segment: "contact-us" },
        kind: "content",
        mode: "live",
        needsConfirm: true,
      },
    ]);
  });

  it("saves a title alone live without asking, because no URL changes", () => {
    expect(plan({ title: "Contact us" })).toEqual([
      { changes: { title: "Contact us" }, kind: "content", mode: "live", needsConfirm: false },
    ]);
  });

  it("makes the page the root page in the same live save, and asks", () => {
    expect(plan({ isFolderRoot: true, title: "Contact us" })).toEqual([
      {
        changes: { isFolderRoot: true, title: "Contact us" },
        kind: "content",
        mode: "live",
        needsConfirm: true,
      },
    ]);
  });
});

describe("pageBodyOf", () => {
  const names = { segmentField: "slug", titleField: "title" };

  it("writes a draft edit as a draft, and a live save as published, in a collection with drafts", () => {
    expect(
      pageBodyOf({
        ...names,
        changes: { segment: "b", title: "B" },
        hasDrafts: true,
        mode: "draft",
      })
    ).toEqual({ _status: "draft", slug: "b", title: "B" });
    expect(
      pageBodyOf({ ...names, changes: { isFolderRoot: true }, hasDrafts: true, mode: "live" })
    ).toEqual({ _status: "published", isFolderRoot: true });
  });

  it("sends no status for a collection without drafts, and the host's own field names", () => {
    expect(
      pageBodyOf({
        changes: { segment: "b", title: "B" },
        hasDrafts: false,
        mode: "live",
        segmentField: "path",
        titleField: "headline",
      })
    ).toEqual({ headline: "B", path: "b" });
  });
});

describe("planFolderSettingsSave", () => {
  const stored: FolderSettingsValues = {
    allowedTypes: [],
    defaultType: "",
    lockSubfolderTypes: false,
    name: "Company",
    parentId: null,
    segment: "company",
  };
  const plan = (edited: Partial<FolderSettingsValues>, isLocked = false) =>
    planFolderSettingsSave({ edited: { ...stored, ...edited }, isLocked, stored });

  it("sends only what changed, and previews a new segment", () => {
    expect(plan({})).toEqual({ locksSubfolders: false, patch: {}, renames: false, toParent: null });
    expect(plan({ name: "Firm" })).toMatchObject({ patch: { name: "Firm" }, renames: false });
    expect(plan({ segment: "firm" })).toMatchObject({ patch: { slug: "firm" }, renames: true });
  });

  it("makes a new parent a move after the save, and keeps it out of the PATCH", () => {
    expect(plan({ parentId: 7 })).toEqual({
      locksSubfolders: false,
      patch: {},
      renames: false,
      toParent: { id: 7 },
    });
    expect(plan({ parentId: 7 }, false).toParent).toEqual({ id: 7 });
  });

  it("confirms locking subfolders when the lock goes on, or when it stays on and the types change", () => {
    const locked: FolderSettingsValues = {
      ...stored,
      allowedTypes: ["posts"],
      lockSubfolderTypes: true,
    };

    expect(plan({ allowedTypes: ["posts"], lockSubfolderTypes: true }).locksSubfolders).toBe(true);
    expect(
      planFolderSettingsSave({ edited: locked, isLocked: false, stored: locked }).locksSubfolders
    ).toBe(false);
    expect(
      planFolderSettingsSave({
        edited: { ...locked, allowedTypes: ["posts", "pages"] },
        isLocked: false,
        stored: locked,
      }).locksSubfolders
    ).toBe(true);
    expect(
      planFolderSettingsSave({
        edited: { ...locked, lockSubfolderTypes: false },
        isLocked: false,
        stored: locked,
      }).locksSubfolders
    ).toBe(false);
  });

  it("sends no type setting from a folder under a lock, which the server would refuse", () => {
    expect(
      plan({ allowedTypes: ["posts"], defaultType: "posts", lockSubfolderTypes: true }, true)
    ).toEqual({ locksSubfolders: false, patch: {}, renames: false, toParent: null });
  });

  it("clears the default type with null, and compares the types as a set", () => {
    const withDefault: FolderSettingsValues = {
      ...stored,
      allowedTypes: ["posts", "pages"],
      defaultType: "posts",
    };

    expect(
      planFolderSettingsSave({
        edited: { ...withDefault, defaultType: "" },
        isLocked: false,
        stored: withDefault,
      }).patch
    ).toEqual({ defaultType: null });
    expect(
      planFolderSettingsSave({
        edited: { ...withDefault, allowedTypes: ["pages", "posts"] },
        isLocked: false,
        stored: withDefault,
      }).patch
    ).toEqual({});
  });
});

describe("effectiveDefaultType", () => {
  it("reads a default that left the list as no default", () => {
    expect(effectiveDefaultType("posts", ["pages"], ["pages", "posts"])).toBe("");
    expect(effectiveDefaultType("posts", ["pages", "posts"], ["pages", "posts"])).toBe("posts");
    expect(effectiveDefaultType("posts", [], ["pages", "posts"])).toBe("posts");
  });
});
