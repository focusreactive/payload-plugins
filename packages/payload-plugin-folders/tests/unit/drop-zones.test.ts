import { describe, expect, it } from "vitest";

import { dropZoneOf } from "../../src/admin/DragAndDrop/dropZones.js";

const rect = { height: 40, top: 100 };

describe("dropZoneOf", () => {
  it("gives a folder the top quarter as before, the middle half as inside, the bottom quarter as after", () => {
    expect(dropZoneOf("folder", 100, rect)).toBe("before");
    expect(dropZoneOf("folder", 109.9, rect)).toBe("before");
    expect(dropZoneOf("folder", 110, rect)).toBe("inside");
    expect(dropZoneOf("folder", 120, rect)).toBe("inside");
    expect(dropZoneOf("folder", 129.9, rect)).toBe("inside");
    expect(dropZoneOf("folder", 130, rect)).toBe("after");
    expect(dropZoneOf("folder", 139.9, rect)).toBe("after");
  });

  it("splits a page in two halves, never inside", () => {
    expect(dropZoneOf("page", 100, rect)).toBe("before");
    expect(dropZoneOf("page", 119.9, rect)).toBe("before");
    expect(dropZoneOf("page", 120, rect)).toBe("after");
    expect(dropZoneOf("page", 139.9, rect)).toBe("after");
  });

  it("does not divide by a row with no height", () => {
    expect(dropZoneOf("folder", 100, { height: 0, top: 100 })).toBe("inside");
    expect(dropZoneOf("page", 100, { height: 0, top: 100 })).toBe("after");
  });
});
