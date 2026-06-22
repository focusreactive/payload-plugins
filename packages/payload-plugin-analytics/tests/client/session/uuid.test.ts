import { afterEach, describe, expect, it, vi } from "vitest";
import { generateUuidV4 } from "../../../src/client/session/uuid";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateUuidV4", () => {
  it("uses crypto.randomUUID when available", () => {
    const fn = vi.fn().mockReturnValue("11111111-2222-4333-8444-555555555555");
    vi.stubGlobal("crypto", {
      randomUUID: fn,
      getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
    });
    const id = generateUuidV4();
    expect(fn).toHaveBeenCalled();
    expect(id).toBe("11111111-2222-4333-8444-555555555555");
  });

  it("falls back to crypto.getRandomValues when randomUUID is missing", () => {
    const getRandomValues = vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = i;
      return arr;
    });
    vi.stubGlobal("crypto", { getRandomValues });
    const id = generateUuidV4();
    expect(getRandomValues).toHaveBeenCalled();
    expect(id).toMatch(UUID_V4);
  });
});
