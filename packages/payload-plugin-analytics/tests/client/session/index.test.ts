import { afterEach, describe, expect, it, vi } from "vitest";
import { getSessionContext } from "../../../src/client/session";
import { __resetInMemoryStore, readSessionRecord } from "../../../src/client/session/store";
import { SESSION_INACTIVITY_MS } from "../../../src/constants/session";

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetInMemoryStore();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getSessionContext", () => {
  it("mints a new record on first call", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-11T10:00:00Z"));
    const ctx = getSessionContext();
    expect(ctx.id).toMatch(/^[0-9a-f-]{36}$/u);
    expect(ctx.eventSeq).toBe(1);
    expect(ctx.elapsedMs).toBe(0);
  });

  it("reuses the record within the inactivity window and increments eventSeq", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-11T10:00:00Z"));
    const a = getSessionContext();
    vi.setSystemTime(new Date("2026-05-11T10:00:05Z"));
    const b = getSessionContext();
    expect(b.id).toBe(a.id);
    expect(b.eventSeq).toBe(2);
    expect(b.elapsedMs).toBe(5000);
  });

  it("rotates to a new record after 30 minutes of inactivity", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-11T10:00:00Z"));
    const a = getSessionContext();
    vi.setSystemTime(new Date("2026-05-11T10:00:00Z").getTime() + SESSION_INACTIVITY_MS + 1);
    const b = getSessionContext();
    expect(b.id).not.toBe(a.id);
    expect(b.eventSeq).toBe(1);
    expect(b.elapsedMs).toBe(0);
  });

  it("persists the bumped eventSeq", () => {
    getSessionContext();
    getSessionContext();
    const persisted = readSessionRecord();
    expect(persisted?.eventSeq).toBe(2);
  });

  it("never throws when crypto global is undefined (SSR-degraded path)", () => {
    vi.stubGlobal("crypto", undefined);
    expect(() => getSessionContext()).not.toThrow();
  });

  it("never throws when both storage backends throw", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    expect(() => getSessionContext()).not.toThrow();
  });

  it("clamps elapsedMs at 0 if startedAt is in the future (clock skew)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-11T10:00:00Z"));
    getSessionContext();
    vi.setSystemTime(new Date("2026-05-11T09:59:59Z"));
    const ctx = getSessionContext();
    expect(ctx.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("does NOT rotate at exactly SESSION_INACTIVITY_MS since lastActivityAt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-11T10:00:00Z"));
    const a = getSessionContext();
    vi.setSystemTime(new Date("2026-05-11T10:00:00Z").getTime() + SESSION_INACTIVITY_MS);
    const b = getSessionContext();
    expect(b.id).toBe(a.id);
  });
});
