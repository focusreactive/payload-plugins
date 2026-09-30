import { describe, it, expect, vi } from "vitest";

import { authCollectionsOf, identityOf } from "./identityOf.js";

const ONE = ["users"];
const TWO = ["admins", "editors"];

// A signed-in person must never read as "nobody asked" — that is what sends the write past the
// permission check. But completing a missing `collection` is only safe when there is one answer:
// `admins:1` and `editors:1` are different people carrying the same id, and evaluating one person's
// write against the other's rights is worse than either honest alternative.
describe("identityOf", () => {
  it("reads both halves when the request carries them", () => {
    expect(identityOf({ user: { id: "anna", collection: "editors" } }, TWO)).toEqual({
      requester: { userId: "anna", userCollection: "editors" },
    });
  });

  it("completes a missing collection when the project has only one", () => {
    const identity = identityOf({ user: { id: "anna" } }, ONE);

    expect(identity).toEqual({ requester: { userId: "anna", userCollection: "users" } });
    expect(identity.requester, "a signed-in user must not read as anonymous").not.toBeNull();
  });

  it("refuses to guess when the project has more than one", () => {
    expect(identityOf({ user: { id: "anna" } }, TWO)).toEqual({ requester: null });
  });

  it("says in the log what a host has to fix for that case", () => {
    const logger = { warn: vi.fn() };

    identityOf({ user: { id: "anna" } }, TWO, logger);

    const [entry] = logger.warn.mock.calls[0] as [{ msg: string; authCollections: string[] }];
    expect(entry.msg).toContain("collection");
    expect(entry.authCollections).toEqual(TWO);
  });

  it("names nobody for an anonymous request", () => {
    expect(identityOf({ user: null }, ONE)).toEqual({ requester: null });
  });

  it("names nobody when there is no user at all", () => {
    expect(identityOf({}, ONE)).toEqual({ requester: null });
  });

  it("keeps a zero id", () => {
    expect(identityOf({ user: { id: 0, collection: "users" } }, ONE).requester?.userId).toBe(0);
  });

  it("names nobody when the project has no auth collection at all", () => {
    expect(identityOf({ user: { id: "anna" } }, []).requester).toBeNull();
  });
});

describe("authCollectionsOf", () => {
  it("lists only the collections a user could have signed in from", () => {
    const payload = {
      config: {
        collections: [
          { slug: "users", auth: true },
          { slug: "posts" },
          { slug: "admins", auth: { useAPIKey: true } },
        ],
      },
    };

    expect(authCollectionsOf(payload)).toEqual(["users", "admins"]);
  });

  it("is empty for a config that declares none", () => {
    expect(authCollectionsOf({ config: { collections: [{ slug: "posts" }] } })).toEqual([]);
  });

  it("is empty for a config it cannot read", () => {
    expect(authCollectionsOf({})).toEqual([]);
  });
});
