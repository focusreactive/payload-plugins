import { describe, expect, it } from "vitest";

import { editorColumnBounds } from "../src/lib/confine.js";

describe("editorColumnBounds", () => {
  it("spans from the editor column to the preview, below the document controls", () => {
    expect(
      editorColumnBounds({
        editor: { left: 275.4, right: 1600, top: 180 },
        preview: { left: 805, right: 1600, top: 180.2 },
      })
    ).toEqual({ left: 275, top: 180, width: 530 });
  });

  it("falls back to the editor column alone when there is no preview beside it", () => {
    expect(editorColumnBounds({ editor: { left: 275, right: 1600, top: 180 } })).toEqual({
      left: 275,
      top: 0,
      width: 1325,
    });
    expect(
      editorColumnBounds({
        editor: { left: 275, right: 1600, top: 180 },
        preview: { left: 0, right: 0, top: 0 },
      })
    ).toEqual({ left: 275, top: 0, width: 1325 });
  });
});
