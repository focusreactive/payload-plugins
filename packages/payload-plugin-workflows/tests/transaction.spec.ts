import type { PayloadRequest } from "payload";
import { describe, expect, it } from "vitest";

import {
  isTransactionLost,
  transactionLost,
  transactionOf,
  writing,
} from "../src/server/transaction.js";

const facts = {
  began: "tx-1",
  current: "tx-1",
  registered: true,
  writeFailed: false,
} as const;

describe("isTransactionLost", () => {
  it("is never lost without a transaction at the start", () => {
    expect(
      isTransactionLost({ began: null, current: null, registered: undefined, writeFailed: true })
    ).toBe(false);
    expect(
      isTransactionLost({ began: null, current: "tx-2", registered: false, writeFailed: false })
    ).toBe(false);
  });

  it("holds while the same transaction is on the request, registered, with no failed write", () => {
    expect(isTransactionLost(facts)).toBe(false);
    // An adapter that does not expose its sessions cannot rule it out, nor in.
    expect(isTransactionLost({ ...facts, registered: undefined })).toBe(false);
  });

  it("is lost when a Payload operation rolled it back (gone from the request)", () => {
    expect(isTransactionLost({ ...facts, current: null })).toBe(true);
  });

  it("is lost when the request now carries another transaction", () => {
    expect(isTransactionLost({ ...facts, current: "tx-2" })).toBe(true);
  });

  it("is lost when the adapter no longer holds its session", () => {
    expect(isTransactionLost({ ...facts, registered: false })).toBe(true);
  });

  it("is lost when a database write failed in it (Postgres aborts it, still registered)", () => {
    expect(isTransactionLost({ ...facts, writeFailed: true })).toBe(true);
  });
});

const requestWith = (transactionID: unknown, sessions?: Record<string, unknown>) =>
  ({ transactionID, payload: { db: { sessions } } }) as unknown as PayloadRequest;

describe("transactionLost", () => {
  it("reads a pending transaction id and treats a null one as none", async () => {
    expect(await transactionOf(requestWith(Promise.resolve(null)))).toBeNull();
    expect(await transactionOf(requestWith(Promise.resolve("tx-1")))).toBe("tx-1");
    expect(await transactionOf(requestWith(undefined))).toBeNull();
  });

  it("is lost after the request's transaction was killed", async () => {
    const req = requestWith("tx-1", { "tx-1": {} });
    expect(await transactionLost(req, "tx-1")).toBe(false);
    delete (req as { transactionID?: unknown }).transactionID;
    expect(await transactionLost(req, "tx-1")).toBe(true);
  });

  it("is lost after the adapter dropped the session", async () => {
    expect(await transactionLost(requestWith("tx-1", {}), "tx-1")).toBe(true);
  });

  it("is lost after a raw write failed inside it, not after one that succeeded", async () => {
    const req = requestWith("tx-1", { "tx-1": {} });
    await writing(req, async () => "ok");
    expect(await transactionLost(req, "tx-1")).toBe(false);
    await expect(
      writing(req, () => Promise.reject(new Error("syntax error in SQL")))
    ).rejects.toThrow("syntax error in SQL");
    expect(await transactionLost(req, "tx-1")).toBe(true);
    // The failure is recorded per request: another request on another transaction is unaffected.
    expect(await transactionLost(requestWith("tx-2", { "tx-2": {} }), "tx-2")).toBe(false);
  });

  it("records nothing for a write that failed outside any transaction", async () => {
    const req = requestWith(undefined, {});
    await expect(writing(req, () => Promise.reject(new Error("x")))).rejects.toThrow("x");
    expect(await transactionLost(req, null)).toBe(false);
  });
});
