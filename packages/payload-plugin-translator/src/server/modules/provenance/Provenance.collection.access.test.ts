import { describe, it, expect } from "vitest";

import { makeProvenanceCollection } from "./Provenance.collection.js";

// A collection that declares no `access` inherits Payload's default, which is "any signed-in user"
// — measured: a signed-in caller can read every row, overwrite `dismissedFingerprint` to suppress the
// out-of-date indicator, and delete history outright. Nothing legitimate reaches these rows through
// the collection's REST surface: the panel reads staleness through the plugin's own endpoint, and the
// plugin itself goes through the Local API, which bypasses access rules.
describe("the provenance collection is closed to the outside", () => {
  const collection = makeProvenanceCollection();

  it("declares access rules at all", () => {
    expect(collection.access).toBeDefined();
  });

  it.each(["read", "create", "update", "delete"] as const)("refuses %s", (operation) => {
    const rule = collection.access?.[operation];

    expect(rule, `no ${operation} rule declared`).toBeTypeOf("function");
    expect(rule?.({ req: { user: { id: "u1" } } } as never)).toBe(false);
  });

  it("refuses an admin just the same — the rows are not user content", () => {
    const rule = collection.access?.update;

    expect(rule?.({ req: { user: { id: "root", roles: ["admin"] } } } as never)).toBe(false);
  });
});
