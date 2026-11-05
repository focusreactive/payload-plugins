import { describe, expect, it } from "vitest";
import {
  endAuthOperation,
  ensureActive,
  getOpFlags,
  getRequestId,
  bindCoverageToTransaction,
  forgetCoverageOfSession,
  isActive,
  isInAuthOperation,
  markActive,
  markAuthOperation,
  newCreateKey,
  operationFlagsOf,
  pushOpFlags,
  releaseCoverageOfSession,
  startedAfter,
  takeActiveCreate,
  takeOpFlags,
  unmarkActive,
  withOperationFlags,
} from "../../src/core/requestState";

const liveSessions: Record<string, unknown> = {};

const adapterWithLiveSessions = { payload: { db: { sessions: liveSessions } } };

const req = (transactionID?: unknown) => {
  if (typeof transactionID === "string") liveSessions[transactionID] ??= {};
  return {
    context: {} as Record<string, unknown>,
    ...adapterWithLiveSessions,
    ...(transactionID === undefined ? {} : { transactionID }),
  };
};

const coverageRegistry = () =>
  (globalThis as Record<symbol, unknown>)[
    Symbol.for("payload-plugin-audit-log.coverageBySession")
  ] as WeakMap<object, Set<unknown>> | undefined;

const sessionOf = (transactionID: string) => liveSessions[transactionID];

const coveredRequestsOf = (transactionID: string): number => {
  const session = sessionOf(transactionID);
  return session ? (coverageRegistry()?.get(session as object)?.size ?? 0) : 0;
};

const isCovered = (transactionID: string): boolean => coveredRequestsOf(transactionID) > 0;

const coveredTransactions = () => Object.keys(liveSessions).filter(isCovered);

const failedOperationWithoutTransaction = () => {
  const r = req();
  markActive(r, "posts", "1");
  markAuthOperation(r, "users");
  pushOpFlags(r, "posts", "1", { draft: true });
  markActive(r, "posts", newCreateKey());
};

describe("requestState", () => {
  it("tracks active documents per request", () => {
    const r = req();
    markActive(r, "posts", "1");
    expect(isActive(r, "posts", "1")).toBe(true);
    expect(isActive(r, "posts", "2")).toBe(false);
    expect(isActive(r, "pages", "1")).toBe(false);
  });

  it("hands out each running create once, newest first", () => {
    const r = req();
    const outer = newCreateKey();
    const nested = newCreateKey();
    markActive(r, "posts", outer);
    markActive(r, "posts", "7");
    markActive(r, "posts", nested);
    expect(takeActiveCreate(r, "pages")).toBe(false);
    expect(takeActiveCreate(r, "posts")).toBe(true);
    expect(takeActiveCreate(r, "posts")).toBe(true);
    expect(takeActiveCreate(r, "posts")).toBe(false);
    expect(isActive(r, "posts", "7")).toBe(true);
    expect(takeActiveCreate(undefined, "posts")).toBe(false);
  });

  it("an active document does not cover creates or writes without an id", () => {
    const r = req();
    markActive(r, "posts", "7");
    expect(takeActiveCreate(r, "posts")).toBe(false);
    expect(isActive(r, "posts", undefined)).toBe(false);
  });

  it("returns false without context", () => {
    expect(isActive(undefined, "posts", "1")).toBe(false);
  });

  it("stores op flags and keeps one request id", () => {
    const r = req();
    pushOpFlags(r, "posts", 1, { draft: true });
    expect(getOpFlags(r, "posts", 1)).toEqual({ draft: true });
    const id = getRequestId(r);
    expect(getRequestId(r)).toBe(id);
    expect(id).toMatch(/^[0-9a-f-]{36}$/u);
  });

  it("keeps op flags per operation so nested operations do not overwrite them", () => {
    const r = req();
    pushOpFlags(r, "posts", "1", { draft: true });
    pushOpFlags(r, "pages", "create", { duplicate: true, duplicateFrom: "9" });
    pushOpFlags(r, "posts", "2", { restore: true });
    expect(getOpFlags(r, "posts", 1)).toEqual({ draft: true });
    expect(getOpFlags(r, "pages", "create")).toEqual({ duplicate: true, duplicateFrom: "9" });
    expect(getOpFlags(r, "posts", "2")).toEqual({ restore: true });
    expect(getOpFlags(r, "posts", "3")).toBeUndefined();
    expect(getOpFlags(undefined, "posts", "1")).toBeUndefined();
  });

  it("keeps the op flags of nested operations on one document on a stack", () => {
    const r = req();
    pushOpFlags(r, "posts", "1", { source: "operation", draft: true });
    pushOpFlags(r, "posts", "1", { source: "operation", autosave: true });
    expect(getOpFlags(r, "posts", "1")).toEqual({ source: "operation", autosave: true });
    expect(takeOpFlags(r, "posts", "1")).toEqual({ source: "operation", autosave: true });
    expect(getOpFlags(r, "posts", "1")).toEqual({ source: "operation", draft: true });
    expect(takeOpFlags(r, "posts", "1")).toEqual({ source: "operation", draft: true });
    expect(takeOpFlags(r, "posts", "1")).toEqual({});
    expect(r.context.__auditOp).toEqual(new Map());
  });

  it("carries the flags of an operation on its own request, apart from the request it wraps", () => {
    const r: ReturnType<typeof req> & { transactionID?: unknown } = req();
    const bulk = { source: "bulk" as const };
    const byId = { source: "operation" as const, draft: true };
    const bulkReq = withOperationFlags(r, "posts", bulk);
    const nestedReq = withOperationFlags(bulkReq, "posts", byId);
    expect(operationFlagsOf(r, "posts")).toBeUndefined();
    expect(operationFlagsOf(bulkReq, "posts")).toBe(bulk);
    expect(operationFlagsOf(nestedReq, "posts")).toBe(byId);
    expect(operationFlagsOf(nestedReq, "pages")).toBeUndefined();
    expect(operationFlagsOf(undefined, "posts")).toBeUndefined();
    expect(nestedReq.context).toBe(r.context);
    nestedReq.transactionID = "tx-written-through";
    expect(r.transactionID).toBe("tx-written-through");
  });

  it("tells whether an operation started after another", () => {
    const r = req();
    const restore = { source: "operation" as const, restore: true };
    pushOpFlags(r, "posts", "restoreVersion", restore);
    const bulk = { source: "bulk" as const };
    withOperationFlags(r, "posts", bulk);
    expect(startedAfter(bulk, restore)).toBe(true);
    expect(startedAfter(restore, bulk)).toBe(false);
    expect(startedAfter(restore, undefined)).toBe(true);
    expect(startedAfter(undefined, restore)).toBe(false);
  });

  it("covers a document until every operation that marked it has ended", () => {
    const r = req();
    markActive(r, "posts", "1");
    markActive(r, "posts", "1");
    unmarkActive(r, "posts", "1");
    expect(isActive(r, "posts", "1")).toBe(true);
    unmarkActive(r, "posts", "1");
    expect(isActive(r, "posts", "1")).toBe(false);
    unmarkActive(r, "posts", "1");
    expect(isActive(r, "posts", "1")).toBe(false);
    expect(r.context.__auditActive).toEqual(new Map());
  });

  it("covers an auth collection until every auth operation on it has ended", () => {
    const r = req();
    markAuthOperation(r, "users");
    markAuthOperation(r, "users");
    endAuthOperation(r, "users");
    expect(isInAuthOperation(r, "users")).toBe(true);
    endAuthOperation(r, "users");
    expect(isInAuthOperation(r, "users")).toBe(false);
    endAuthOperation(undefined, "users");
  });

  it("releases the markers of the requests whose transaction is rolled back, and only those", () => {
    const rolledBack = req("tx-1");
    const other = req("tx-2");
    markActive(rolledBack, "posts", "1");
    markAuthOperation(rolledBack, "users");
    pushOpFlags(rolledBack, "posts", "1", { draft: true });
    markActive(other, "posts", "1");

    releaseCoverageOfSession(sessionOf("tx-1"));

    expect(isActive(rolledBack, "posts", "1")).toBe(false);
    expect(isInAuthOperation(rolledBack, "users")).toBe(false);
    expect(getOpFlags(rolledBack, "posts", "1")).toBeUndefined();
    expect(isActive(other, "posts", "1")).toBe(true);
    releaseCoverageOfSession(undefined);
    expect(isActive(other, "posts", "1")).toBe(true);
    expect(isCovered("tx-1")).toBe(false);
    expect(isCovered("tx-2")).toBe(true);
    forgetCoverageOfSession(sessionOf("tx-2"));
  });

  it("keeps the flags an operation carries on its request when one of its documents rolls the shared transaction back", () => {
    const r = req("tx-bulk");
    const bulkReq = withOperationFlags(r, "users", { source: "bulk", draft: true });
    markActive(bulkReq, "users", "7");

    releaseCoverageOfSession(sessionOf("tx-bulk"));

    expect(operationFlagsOf(bulkReq, "users")).toEqual({ source: "bulk", draft: true });
    expect(isActive(r, "users", "7")).toBe(false);
    expect(isCovered("tx-bulk")).toBe(false);
  });

  it("releases markers set before the request joined the rolled back transaction once a write binds them to it", () => {
    const r: ReturnType<typeof req> & { transactionID?: unknown } = req();
    markAuthOperation(r, "users");
    liveSessions["tx-3"] = {};
    r.transactionID = "tx-3";
    bindCoverageToTransaction(r);
    expect(isCovered("tx-3")).toBe(true);
    releaseCoverageOfSession(sessionOf("tx-3"));
    expect(isInAuthOperation(r, "users")).toBe(false);
    expect(isCovered("tx-3")).toBe(false);
  });

  it("does not register requests without a transaction, however many of their operations fail", () => {
    for (let i = 0; i < 1000; i += 1) failedOperationWithoutTransaction();
    bindCoverageToTransaction(req());
    bindCoverageToTransaction(undefined);
    expect(coveredTransactions()).toEqual([]);
  });

  it("does not bind a request without coverage or with a transaction that is still starting", () => {
    bindCoverageToTransaction(req("tx-empty"));
    liveSessions["tx-starting"] = {};
    const starting = req(Promise.resolve("tx-starting"));
    markActive(starting, "posts", "1");
    bindCoverageToTransaction(starting);
    expect(coveredTransactions()).toEqual([]);
  });

  it("does not register a request whose transaction id has no live session on the adapter", () => {
    const committedByHand = { ...req(), transactionID: "tx-committed-by-hand" };
    markActive(committedByHand, "posts", "1");
    bindCoverageToTransaction(committedByHand);
    const withoutAdapter = { context: {}, transactionID: "tx-without-adapter" };
    markActive(withoutAdapter, "posts", "1");
    expect(coveredTransactions()).toEqual([]);
    expect(isActive(committedByHand, "posts", "1")).toBe(true);
  });

  it("forgets a committed transaction without touching its requests' markers", () => {
    const committed = req("tx-4");
    markActive(committed, "posts", "1");
    markActive(req("tx-4"), "posts", "2");
    expect(coveredTransactions()).toEqual(["tx-4"]);
    expect(coveredRequestsOf("tx-4")).toBe(2);

    forgetCoverageOfSession(sessionOf("tx-4"));

    expect(coveredTransactions()).toEqual([]);
    expect(isActive(committed, "posts", "1")).toBe(true);
  });

  it("removes a rolled back transaction from the registry", () => {
    markActive(req("tx-5"), "posts", "1");
    releaseCoverageOfSession(sessionOf("tx-5"));
    expect(coveredTransactions()).toEqual([]);
  });

  it("keeps the coverage of a new session apart from the session that used its transaction id before", () => {
    const earlier = req("tx-6");
    markActive(earlier, "posts", "1");
    const earlierSession = sessionOf("tx-6");
    liveSessions["tx-6"] = {};
    const later = req("tx-6");
    markActive(later, "posts", "2");

    releaseCoverageOfSession(earlierSession);

    expect(isActive(earlier, "posts", "1")).toBe(false);
    expect(isActive(later, "posts", "2")).toBe(true);
    expect(coveredRequestsOf("tx-6")).toBe(1);
    forgetCoverageOfSession(sessionOf("tx-6"));
  });

  it("ensures a key is active without counting it twice", () => {
    const r = req();
    ensureActive(r, "posts", "create:a");
    ensureActive(r, "posts", "create:a");
    expect(takeActiveCreate(r, "posts")).toBe(true);
    expect(takeActiveCreate(r, "posts")).toBe(false);
  });
});
