import { describe, it, expect } from "vitest";

import { asRequester, freshReq } from "../RequestScope.shapes.js";

describe("freshReq", () => {
  it("carries the transaction and nothing else", () => {
    const scope = { transactionID: "tx-1", requester: asRequester("anna", "users") };

    expect(freshReq(scope)).toEqual({ transactionID: "tx-1" });
  });

  it("is empty when there is no transaction", () => {
    expect(freshReq({ requester: asRequester("anna", "users") })).toEqual({});
  });

  it("hands out a different object each time", () => {
    const scope = { transactionID: "tx-1" };

    expect(freshReq(scope)).not.toBe(freshReq(scope));
  });
});

describe("asRequester", () => {
  it("builds a requester when both halves are there", () => {
    expect(asRequester("anna", "users")).toEqual({ userId: "anna", userCollection: "users" });
  });

  // Zero is a real id on a database that counts from zero. Reading it as nobody would send the
  // write past the permission check, which is the one failure this constructor exists to prevent.
  it("treats a zero id as a requester", () => {
    expect(asRequester(0, "users")).toEqual({ userId: 0, userCollection: "users" });
  });

  it.each([
    ["no id", null, "users"],
    ["an undefined id", undefined, "users"],
    ["no collection", "anna", null],
    ["an undefined collection", "anna", undefined],
    ["neither", null, null],
  ])("names nobody for %s", (_label, id, collection) => {
    expect(asRequester(id, collection)).toBeNull();
  });

  // A stored row naming a collection that does not exist must fail the requester lookup, not turn
  // into an unattributed write — those bypass the permission check entirely.
  it("keeps a present but unusable collection rather than dropping it", () => {
    expect(asRequester("anna", "")).toEqual({ userId: "anna", userCollection: "" });
  });
});
