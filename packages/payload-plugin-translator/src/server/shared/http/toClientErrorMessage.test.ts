import { afterEach, describe, expect, it, vi } from "vitest";

import { GENERIC_TRANSLATION_ERROR, toClientErrorMessage } from "./toClientErrorMessage";

describe("toClientErrorMessage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("passes the raw message through in development (debug aid)", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(toClientErrorMessage("401 Incorrect API key provided: sk-proj-abc")).toBe(
      "401 Incorrect API key provided: sk-proj-abc"
    );
  });

  it("passes the raw message through in test", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(toClientErrorMessage("boom")).toBe("boom");
  });

  it("returns the generic message in production — no implementation detail or secrets", () => {
    vi.stubEnv("NODE_ENV", "production");
    const out = toClientErrorMessage("401 Incorrect API key provided: sk-proj-abc");
    expect(out).toBe(GENERIC_TRANSLATION_ERROR);
    expect(out).not.toContain("sk-proj");
  });

  it("is fail-safe: an unset NODE_ENV is treated as non-debug", () => {
    vi.stubEnv("NODE_ENV", undefined);
    expect(toClientErrorMessage("boom")).toBe(GENERIC_TRANSLATION_ERROR);
  });

  it("falls back to the generic message when there is no usable message in a debug env", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(toClientErrorMessage(undefined)).toBe(GENERIC_TRANSLATION_ERROR);
    expect(toClientErrorMessage("   ")).toBe(GENERIC_TRANSLATION_ERROR);
  });
});
