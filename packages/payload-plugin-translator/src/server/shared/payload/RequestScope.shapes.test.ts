import { describe, it, expect } from "vitest";
import { APIError } from "payload";

import { freshReq, isAttributed, killedTheCallersTransaction } from "./RequestScope.shapes";

describe("killedTheCallersTransaction", () => {
  it("is true for a Payload error raised inside the caller's transaction", () => {
    expect(killedTheCallersTransaction({ transactionID: "tx-1" }, new APIError("rejected"))).toBe(
      true
    );
  });

  it("is false for a failure that reached no Payload operation", () => {
    expect(killedTheCallersTransaction({ transactionID: "tx-1" }, new Error("provider down"))).toBe(
      false
    );
  });

  it("is false when there is no caller transaction to destroy", () => {
    expect(killedTheCallersTransaction({}, new APIError("rejected"))).toBe(false);
  });

  it("is false when neither holds", () => {
    expect(killedTheCallersTransaction({}, new Error("provider down"))).toBe(false);
  });

  it("treats the MongoDB adapter's zero transaction id as a transaction", () => {
    expect(killedTheCallersTransaction({ transactionID: 0 }, new APIError("rejected"))).toBe(true);
  });
});

describe("freshReq", () => {
  it("carries the transaction and nothing else", () => {
    expect(freshReq({ transactionID: "tx-1", userId: "anna", userCollection: "users" })).toEqual({
      transactionID: "tx-1",
    });
  });

  it("is empty when there is no transaction", () => {
    expect(freshReq({ userId: "anna", userCollection: "users" })).toEqual({});
  });

  // `createLocalReq` fills the object it is handed in place, so two calls must not share one.
  it("hands out a different object each time", () => {
    const scope = { transactionID: "tx-1" };
    expect(freshReq(scope)).not.toBe(freshReq(scope));
  });
});

describe("isAttributed", () => {
  it("is true only when both halves of the identity are present", () => {
    expect(isAttributed({ userId: "anna", userCollection: "users" })).toBe(true);
  });

  it.each([
    ["no identity at all", {}],
    ["an id with no collection", { userId: "anna" }],
    ["a collection with no id", { userCollection: "users" }],
    ["an explicitly absent id", { userId: null, userCollection: "users" }],
  ])("is false for %s", (_label, scope) => {
    expect(isAttributed(scope)).toBe(false);
  });

  // A numeric id of 0 is a real id on a database that counts from zero, and it is falsy.
  it("treats a zero id as an identity", () => {
    expect(isAttributed({ userId: 0, userCollection: "users" })).toBe(true);
  });
});
