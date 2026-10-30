import { describe, expect, it } from "vitest";

import type { DropRules } from "../../src/admin/DragAndDrop/dropTargets.js";
import { markerReasonOf, placeMarkers } from "../../src/admin/MoveMode/moveMarkers.js";
import type { MoveMarker } from "../../src/admin/MoveMode/moveMarkers.js";
import { flattenTree } from "../../src/admin/Tree/useTreeData.js";
import { folderRow, pageRow, stateOf } from "../helpers/treeItems.js";

const rules: DropRules = {
  enforceAllowedTypes: true,
  maxDepth: 20,
  reservedRootSegments: ["admin"],
  typeLabels: { pages: "Page", posts: "Blog post" },
};

const blog = folderRow(1, "Blog", null, { childCount: 2 });
const postA = pageRow(11, "Post A", 1, { orderKey: "a0", slug: "post-a" });
const year = folderRow(12, "Year", 1, {
  allowedTypes: ["posts"],
  childCount: 1,
  depth: 2,
  orderKey: "a1",
});
const yearPost = pageRow(50, "Year Post", 12, { collection: "posts", depth: 3 });
const products = folderRow(2, "Products", null, { childCount: 3 });
const standalone = pageRow(3, "Standalone", null);
const emptyFolder = folderRow(4, "Empty", null, { childCount: 0 });

const state = stateOf(
  {
    "1": [postA, year],
    "12": [yearPost],
    root: [blog, products, standalone, emptyFolder],
  },
  ["1"]
);
const stateWithYearOpen = stateOf(
  {
    "1": [postA, year],
    "12": [yearPost],
    root: [blog, products, standalone, emptyFolder],
  },
  ["1", "12"]
);

const markersOf = (
  moving: Parameters<typeof placeMarkers>[1]["moving"],
  openState = state
): MoveMarker[] =>
  placeMarkers(flattenTree(openState), { moving, rules, state: openState }).flatMap((entry) =>
    entry.type === "marker" ? [entry.marker] : []
  );

const markerNamed = (markers: MoveMarker[], key: string): MoveMarker => {
  const found = markers.find((marker) => marker.key === key);
  if (!found) {
    throw new Error(`No marker ${key} among ${markers.map((marker) => marker.key).join(", ")}`);
  }

  return found;
};

describe("placeMarkers, where the markers are", () => {
  it("puts one at the top, one under each open folder and one after every row, in screen order", () => {
    const placed = placeMarkers(flattenTree(state), { moving: [standalone], rules, state }).map(
      (entry) => (entry.type === "marker" ? `marker ${entry.marker.key}` : entry.row.key)
    );

    expect(placed).toEqual([
      "marker top",
      "folders:1",
      "marker inside:1",
      "pages:11",
      "marker after:pages:11",
      "folders:12",
      "marker after:folders:12",
      "marker after:folders:1",
      "folders:2",
      "marker after:folders:2",
      "pages:3",
      "marker after:pages:3",
      "folders:4",
      "marker inside:4",
      "marker after:folders:4",
    ]);
  });

  it("gives a closed folder no inside marker, and an empty folder one, so it can be filled by keyboard", () => {
    const keys = markersOf([standalone]).map((marker) => marker.key);

    expect(keys).not.toContain("inside:2");
    expect(keys).toContain("inside:4");
  });

  it("indents each marker to the rows it sits between", () => {
    const levels = Object.fromEntries(
      markersOf([standalone]).map((marker) => [marker.key, marker.level])
    );

    expect(levels).toMatchObject({
      "after:folders:1": 0,
      "after:pages:11": 1,
      "inside:1": 1,
      top: 0,
    });
  });

  it("opens the gaps of a folder the editor opened while Move mode is on", () => {
    const keys = markersOf([standalone], stateWithYearOpen).map((marker) => marker.key);

    expect(keys).toContain("inside:12");
    expect(keys).toContain("after:posts:50");
  });
});

describe("placeMarkers, the move each marker asks for", () => {
  const markers = markersOf([standalone]);

  it("maps a gap the way a drop maps it: after a row, or the top of a folder", () => {
    expect(markerNamed(markers, "after:pages:11").target).toEqual({
      after: { collection: "pages", id: 11 },
      toFolder: 1,
    });
    expect(markerNamed(markers, "inside:1").target).toEqual({ position: "start", toFolder: 1 });
    expect(markerNamed(markers, "top").target).toEqual({ position: "start", toFolder: null });
  });

  it("puts the gap after an open folder next to the folder, not inside it", () => {
    expect(markerNamed(markers, "after:folders:1").target).toEqual({
      after: { collection: "folders", id: 1 },
      toFolder: null,
    });
  });

  it("names the folder the rows land in", () => {
    expect(markerNamed(markers, "inside:1").targetFolder?.title).toBe("Blog");
    expect(markerNamed(markers, "after:pages:11").targetFolder?.title).toBe("Blog");
    expect(markerNamed(markers, "top").targetFolder).toBeNull();
  });

  it("skips a moving row when a gap is next to it, as a drop does", () => {
    // The gap after Post A would be "after Post A", which is moving: it lands after nothing, at the top.
    const movingPost = markersOf([postA]);

    expect(markerNamed(movingPost, "after:pages:11").target).toEqual({
      position: "start",
      toFolder: 1,
    });
  });
});

describe("placeMarkers, which markers are off", () => {
  it("refuses every gap inside a moving folder as a cycle, and no gap outside it", () => {
    const markers = markersOf([blog]);

    for (const key of ["inside:1", "after:pages:11", "after:folders:12"]) {
      expect(markerNamed(markers, key).refusal).toEqual({ kind: "cycle" });
    }
    expect(markerNamed(markers, "after:folders:2").refusal).toBeNull();
    expect(markerNamed(markers, "inside:4").refusal).toBeNull();
  });

  it("refuses a page in a folder that takes another type, with the folder's types", () => {
    const markers = markersOf([standalone], stateWithYearOpen);

    expect(markerNamed(markers, "inside:12").refusal).toEqual({
      kind: "type",
      path: "/year",
      types: ["Blog post"],
    });
    expect(markerNamed(markers, "after:posts:50").refusal?.kind).toBe("type");
    expect(markerNamed(markers, "inside:1").refusal).toBeNull();
  });

  it("refuses a page whose segment is taken in the folder, as a drop does", () => {
    const sameSegment = pageRow(60, "Post A", null, { slug: "post-a", status: "published" });
    const markers = markersOf([sameSegment]);

    expect(markerNamed(markers, "inside:1").refusal).toEqual({
      kind: "conflict",
      otherTitle: "Post A",
      path: "/blog/post-a",
      title: "Post A",
    });
  });

  it("refuses a reserved segment at the top level", () => {
    const reserved = pageRow(61, "Admin", 1, { slug: "admin" });
    const markers = markersOf([reserved]);

    expect(markerNamed(markers, "top").refusal).toEqual({
      dot: false,
      kind: "reserved",
      segment: "admin",
    });
    expect(markerNamed(markers, "inside:1").refusal).toBeNull();
  });

  it("marks the gaps that leave the order as it is", () => {
    const markers = markersOf([postA]);

    expect(markerNamed(markers, "inside:1").isNoOp).toBe(true);
    expect(markerNamed(markers, "after:pages:11").isNoOp).toBe(true);
    expect(markerNamed(markers, "after:folders:12").isNoOp).toBe(false);
    expect(markerNamed(markers, "top").isNoOp).toBe(false);
  });
});

const translate = (key: string, variables?: Record<string, number | string>) =>
  `${key}${variables === undefined ? "" : JSON.stringify(variables)}`;

describe("markerReasonOf", () => {
  const reasonOf = (marker: MoveMarker, isBusy = false) =>
    markerReasonOf(marker, { count: 1, isBusy, translate: translate as never });

  it("is null for a gap that takes the rows", () => {
    expect(reasonOf(markerNamed(markersOf([standalone]), "inside:1"))).toBeNull();
  });

  it("gives the same words as drag and drop for a refusal", () => {
    expect(reasonOf(markerNamed(markersOf([blog]), "inside:1"))).toBe("moveToCycle");
  });

  it("says the rows are already there for a gap that changes nothing", () => {
    expect(reasonOf(markerNamed(markersOf([postA]), "inside:1"))).toBe('moveModeNoOp{"count":1}');
  });

  it("turns every marker off while a move is in flight", () => {
    expect(reasonOf(markerNamed(markersOf([standalone]), "inside:1"), true)).toBe("menuBusy");
  });
});
