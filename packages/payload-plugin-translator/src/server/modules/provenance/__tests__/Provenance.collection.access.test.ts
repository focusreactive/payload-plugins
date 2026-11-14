import { describe, it, expect } from "vitest";

import { makeProvenanceCollection } from "../Provenance.collection.js";

// With no `access`, Payload defaults to "any signed-in user" — enough to rewrite
// `sourceFingerprint` and hide the out-of-date mark. Nothing legitimate needs REST here: the panel
// reads the plugin's endpoint and the plugin uses the Local API, which bypasses access rules.
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
