import { describe, expect, it } from "vitest";

import type { TreeNode } from "../../../../../types/wire/DocumentTranslationState.js";
import {
  addressesOf,
  checkStateOf,
  filterTree,
  initialSelection,
  selectedInTreeOrder,
  toggleNode,
} from "../fieldSelection.js";

const title: TreeNode = { kind: "leaf", label: "Title", address: "title", required: true };
const summary: TreeNode = { kind: "leaf", label: "Summary", address: "summary", required: false };
const heading: TreeNode = {
  kind: "leaf",
  label: "Heading",
  address: "s.b1.heading",
  required: false,
};
const lead: TreeNode = { kind: "leaf", label: "Lead", address: "s.b1.lead", required: false };
const hero: TreeNode = { kind: "group", label: "Hero", children: [heading, lead] };
const sections: TreeNode = { kind: "group", label: "Sections", children: [hero] };
const sidebar: TreeNode = {
  kind: "whole-list",
  label: "Sidebar",
  addresses: ["side.s1.text", "side.s2.text"],
};
const TREE: readonly TreeNode[] = [title, summary, sections, sidebar];

const set = (...addresses: string[]) => new Set(addresses);
const none = set();

describe("the leaves a node stands for", () => {
  it("is every leaf below a group, and every leaf of a whole list", () => {
    expect(addressesOf(sections)).toEqual(["s.b1.heading", "s.b1.lead"]);
    expect(addressesOf(sidebar)).toEqual(["side.s1.text", "side.s2.text"]);
    expect(addressesOf(title)).toEqual(["title"]);
  });
});

describe("the first selection of a tracked locale", () => {
  it("picks the locked leaves and every leaf not current", () => {
    const selection = initialSelection(
      TREE,
      {
        title: "current",
        summary: "drifted",
        "s.b1.heading": "unanswered",
        "s.b1.lead": "current",
      },
      ["title"]
    );
    expect(selectedInTreeOrder(TREE, selection)).toEqual(["title", "summary", "s.b1.heading"]);
  });

  it("takes a whole list in whole when any of its leaves is behind", () => {
    const selection = initialSelection(TREE, { "side.s2.text": "unrecorded" }, []);
    expect(selectedInTreeOrder(TREE, selection)).toEqual(["side.s1.text", "side.s2.text"]);
  });

  it("treats a leaf with no verdict as current", () => {
    expect(initialSelection(TREE, {}, []).size).toBe(0);
  });
});

describe("a node's checkbox", () => {
  it("is checked, unchecked or mixed by its leaves", () => {
    expect(checkStateOf(hero, set("s.b1.heading", "s.b1.lead"))).toBe("checked");
    expect(checkStateOf(hero, none)).toBe("unchecked");
    expect(checkStateOf(hero, set("s.b1.lead"))).toBe("mixed");
    expect(checkStateOf(sections, set("s.b1.lead"))).toBe("mixed");
  });

  it("selects every leaf below a node that is not fully checked", () => {
    expect(toggleNode(hero, set("s.b1.lead"), none)).toEqual(set("s.b1.lead", "s.b1.heading"));
    expect(toggleNode(sections, none, none)).toEqual(set("s.b1.heading", "s.b1.lead"));
  });

  it("clears every leaf below a fully checked node", () => {
    expect(toggleNode(hero, set("s.b1.heading", "s.b1.lead", "title"), none)).toEqual(set("title"));
  });

  it("toggles a whole list as one item", () => {
    const on = toggleNode(sidebar, none, none);
    expect(on).toEqual(set("side.s1.text", "side.s2.text"));
    expect(checkStateOf(sidebar, on)).toBe("checked");
    expect(toggleNode(sidebar, on, none)).toEqual(none);
  });

  it("keeps a locked leaf selected when its parent is cleared", () => {
    const locked = set("s.b1.heading");
    const all = set("s.b1.heading", "s.b1.lead");
    expect(toggleNode(hero, all, locked)).toEqual(set("s.b1.heading"));
    expect(toggleNode(heading, all, locked)).toEqual(all);
  });
});

describe("the field filter", () => {
  it("keeps a matching leaf with its ancestors only", () => {
    expect(filterTree(TREE, "lea")).toEqual([
      { ...sections, children: [{ ...hero, children: [lead] }] },
    ]);
  });

  it("keeps a whole group whose label matches", () => {
    expect(filterTree(TREE, "hero")).toEqual([{ ...sections, children: [hero] }]);
  });

  it("ignores case and surrounding space, and keeps everything for an empty query", () => {
    expect(filterTree(TREE, "  SIDEBAR ")).toEqual([sidebar]);
    expect(filterTree(TREE, "")).toEqual(TREE);
  });
});
