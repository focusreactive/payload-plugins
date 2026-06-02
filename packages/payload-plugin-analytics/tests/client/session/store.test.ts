import { afterEach, describe, expect, it, vi } from "vitest";
import { readSessionRecord, writeSessionRecord, __resetInMemoryStore } from "../../../src/client/session/store";
import { SESSION_STORAGE_KEY } from "../../../src/constants/session";

const rec = { id: "abc", startedAt: 1, lastActivityAt: 1, eventSeq: 0 };

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetInMemoryStore();
  vi.restoreAllMocks();
});

describe("session store", () => {
  it("round-trips a record through localStorage", () => {
    writeSessionRecord(rec);
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toContain('"id":"abc"');
    expect(readSessionRecord()).toEqual(rec);
  });

  it("falls back to sessionStorage when localStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("quota");
    });
    writeSessionRecord(rec);
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toContain('"id":"abc"');
    expect(readSessionRecord()).toEqual(rec);
  });

  it("falls back to in-memory when both storages throw", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    writeSessionRecord(rec);
    expect(readSessionRecord()).toEqual(rec);
    spy.mockRestore();
  });

  it("returns null when no record exists", () => {
    expect(readSessionRecord()).toBeNull();
  });

  it("returns null when the persisted JSON is malformed", () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, "{not valid");
    expect(readSessionRecord()).toBeNull();
  });

  it("returns null when the persisted shape is wrong", () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ id: 42 }));
    expect(readSessionRecord()).toBeNull();
  });
});
