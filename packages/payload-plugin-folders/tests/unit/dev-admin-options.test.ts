import { describe, expect, it } from "vitest";

import { adminOptionsFromEnv } from "../../dev/adminOptionsFromEnv.js";

describe("adminOptionsFromEnv", () => {
  it("asks for nothing when no variable is set", () => {
    expect(adminOptionsFromEnv({})).toEqual({});
  });

  it("turns the tree view off, or sets the confirmation mode", () => {
    expect(adminOptionsFromEnv({ FOLDERS_TREE_VIEW: "false" })).toEqual({ treeView: false });
    expect(adminOptionsFromEnv({ FOLDERS_CONFIRM_MOVES: "always" })).toEqual({
      confirmMoves: "always",
    });
  });

  it("keeps both when both are set, and ignores a mode it does not know", () => {
    expect(
      adminOptionsFromEnv({ FOLDERS_CONFIRM_MOVES: "never", FOLDERS_TREE_VIEW: "false" })
    ).toEqual({ confirmMoves: "never", treeView: false });
    expect(adminOptionsFromEnv({ FOLDERS_CONFIRM_MOVES: "sometimes" })).toEqual({});
  });
});
