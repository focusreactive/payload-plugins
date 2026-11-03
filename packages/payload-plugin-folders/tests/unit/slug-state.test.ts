import { describe, expect, it } from "vitest";

import {
  initialSlugState,
  slugAfterEdit,
  slugAfterRelink,
  slugAfterSourceChange,
} from "../../src/admin/Create/slugState.js";

describe("the URL segment field's auto and link state", () => {
  it("starts empty and linked", () => {
    expect(initialSlugState).toEqual({ isLinked: true, value: "" });
  });

  it("follows the name while it is linked", () => {
    let state = slugAfterSourceChange(initialSlugState, "Summer");
    expect(state).toEqual({ isLinked: true, value: "summer" });

    state = slugAfterSourceChange(state, "Summer Sale 2026");
    expect(state).toEqual({ isLinked: true, value: "summer-sale-2026" });
  });

  it("makes the segment from the name the way the server does", () => {
    expect(slugAfterSourceChange(initialSlugState, "Über uns & Co.").value).toBe("ueber-uns-co");
    expect(slugAfterSourceChange(initialSlugState, "  ").value).toBe("");
  });

  it("unlinks when the editor types, and keeps what they typed as the name changes", () => {
    let state = slugAfterSourceChange(initialSlugState, "Summer");
    state = slugAfterEdit("my-own");

    expect(state).toEqual({ isLinked: false, value: "my-own" });
    expect(slugAfterSourceChange(state, "Summer Sale")).toEqual({
      isLinked: false,
      value: "my-own",
    });
  });

  it("stays unlinked even when the typed text equals what the name would give", () => {
    const state = slugAfterEdit("summer");

    expect(slugAfterSourceChange(state, "Summer").isLinked).toBe(false);
  });

  it("stays unlinked when the editor empties the field", () => {
    expect(slugAfterEdit("")).toEqual({ isLinked: false, value: "" });
  });

  it("follows the name again after the link icon, from the name as it is now", () => {
    const relinked = slugAfterRelink("Summer Sale");

    expect(relinked).toEqual({ isLinked: true, value: "summer-sale" });
    expect(slugAfterSourceChange(relinked, "Autumn Sale").value).toBe("autumn-sale");
  });
});
