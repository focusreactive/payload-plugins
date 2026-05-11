import { describe, expect, it } from "vitest";
import { mapGa4Error } from "../../src/endpoints/errorMapping";

function makeErr(messagePrefix: string, originalMessage: string) {
  // SDK formats: `${numericCode} ${Status[code]}: ${original-message}` (e.g. "3 INVALID_ARGUMENT: bad date format").
  // We replicate the message contract without binding to a specific numeric code.
  const e = new Error(`${messagePrefix}: ${originalMessage}`);
  return e;
}

describe("mapGa4Error", () => {
  it("INVALID_ARGUMENT → 400 with full message", () => {
    const r = mapGa4Error(makeErr("3 INVALID_ARGUMENT", "bad date format"));
    expect(r.status).toBe(400);
    expect(r.message).toMatch(/INVALID_ARGUMENT/);
  });
  it("PERMISSION_DENIED → 403", () => {
    expect(mapGa4Error(makeErr("7 PERMISSION_DENIED", "no access")).status).toBe(403);
  });
  it("RESOURCE_EXHAUSTED → 429", () => {
    expect(mapGa4Error(makeErr("8 RESOURCE_EXHAUSTED", "out of tokens")).status).toBe(429);
  });
  it("UNAUTHENTICATED → 500 with creds-invalid message", () => {
    const r = mapGa4Error(makeErr("16 UNAUTHENTICATED", "bad creds"));
    expect(r.status).toBe(500);
    expect(r.message).toMatch(/credentials are invalid/i);
  });
  it("plain Error (no gRPC code prefix) → 500 with err.message", () => {
    const r = mapGa4Error(new Error("boom"));
    expect(r.status).toBe(500);
    expect(r.message).toBe("boom");
  });
  it("non-Error rejection (plain string) → 500 with String(err)", () => {
    expect(mapGa4Error("network down")).toEqual({ status: 500, message: "network down" });
  });
});
