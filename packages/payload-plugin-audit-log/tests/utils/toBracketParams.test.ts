import { describe, expect, it } from "vitest";
import { toBracketParams } from "../../src/utils/toBracketParams";

const decoded = (params: URLSearchParams) => [...params.entries()];

describe("toBracketParams", () => {
  it("encodes a flat where as bracket params", () => {
    expect(decoded(toBracketParams({ action: { equals: "doc.delete" } }))).toEqual([
      ["where[action][equals]", "doc.delete"],
    ]);
  });

  it("encodes nested and/or groups with their array indexes", () => {
    const where = {
      or: [
        { "actor.type": { equals: "agent" } },
        { and: [{ "target.slug": { equals: "posts" } }, { occurredAt: { greater_than: 5 } }] },
      ],
    };
    expect(decoded(toBracketParams(where))).toEqual([
      ["where[or][0][actor.type][equals]", "agent"],
      ["where[or][1][and][0][target.slug][equals]", "posts"],
      ["where[or][1][and][1][occurredAt][greater_than]", "5"],
    ]);
  });

  it("encodes in-lists and booleans, and skips null and undefined values", () => {
    const where = { via: { in: ["mcp", "rest"] }, overrideAccess: { equals: false }, x: null };
    expect(decoded(toBracketParams(where))).toEqual([
      ["where[via][in][0]", "mcp"],
      ["where[via][in][1]", "rest"],
      ["where[overrideAccess][equals]", "false"],
    ]);
  });

  it("returns empty params without a where", () => {
    expect(toBracketParams(undefined).toString()).toBe("");
  });
});
