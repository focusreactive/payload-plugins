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
    expect(r.message).toMatch(/INVALID_ARGUMENT/u);
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
    expect(r.message).toMatch(/credentials are invalid/iu);
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

describe("mapGa4Error setupRequired derivation", () => {
  it("flags setupRequired + missingKey when message names customEvent:fr_session_id", () => {
    const m = mapGa4Error(new Error("3 INVALID_ARGUMENT: Field customEvent:fr_session_id is unrecognized."));
    expect(m.status).toBe(400);
    expect(m.setupRequired).toBe(true);
    expect(m.missingKey).toBe("fr_session_id");
  });

  it("flags setupRequired + fr_elapsed_ms for averageCustomEvent:fr_elapsed_ms", () => {
    const m = mapGa4Error(new Error("3 INVALID_ARGUMENT: Field averageCustomEvent:fr_elapsed_ms is unrecognized."));
    expect(m.setupRequired).toBe(true);
    expect(m.missingKey).toBe("fr_elapsed_ms");
  });

  it("plain INVALID_ARGUMENT without a known custom field → no setupRequired", () => {
    const m = mapGa4Error(new Error("3 INVALID_ARGUMENT: bad date format"));
    expect(m.setupRequired).toBeUndefined();
    expect(m.missingKey).toBeUndefined();
  });

  it("non-INVALID_ARGUMENT errors never set setupRequired", () => {
    const m = mapGa4Error(new Error("8 RESOURCE_EXHAUSTED"));
    expect(m.setupRequired).toBeUndefined();
  });

  it("flags setupRequired + fr_session_start for customEvent:fr_session_start", () => {
    const m = mapGa4Error(new Error("3 INVALID_ARGUMENT: Field customEvent:fr_session_start is unrecognized."));
    expect(m.setupRequired).toBe(true);
    expect(m.missingKey).toBe("fr_session_start");
  });

  it("flags setupRequired + fr_lead_type for customEvent:fr_lead_type", () => {
    const m = mapGa4Error(new Error("3 INVALID_ARGUMENT: Field customEvent:fr_lead_type is unrecognized."));
    expect(m.setupRequired).toBe(true);
    expect(m.missingKey).toBe("fr_lead_type");
  });
});
