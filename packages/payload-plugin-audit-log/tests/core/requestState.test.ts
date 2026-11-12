import { describe, expect, it } from "vitest";
import {
  getOpFlags,
  getRequestId,
  operationFlagsOf,
  pushOpFlags,
  startedAfter,
  takeOpFlags,
  withOperationFlags,
} from "../../src/core/requestState";

const req = () => ({ context: {} as Record<string, unknown> });

describe("requestState", () => {
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
    pushOpFlags(r, "pages", "restoreVersion", { restore: true, draft: true });
    pushOpFlags(r, "posts", "2", { restore: true });
    expect(getOpFlags(r, "posts", 1)).toEqual({ draft: true });
    expect(getOpFlags(r, "pages", "restoreVersion")).toEqual({ restore: true, draft: true });
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
});
