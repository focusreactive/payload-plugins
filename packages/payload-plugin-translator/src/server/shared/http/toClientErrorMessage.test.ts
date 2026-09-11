import { afterEach, describe, expect, it, vi } from "vitest";

import { markFailureReason } from "../../../core/domain/translation-providers/failureReason";
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

  describe("a marked message", () => {
    const MARKED = markFailureReason(
      "model-unavailable",
      'The model "gpt-5.4-mini" does not exist or you do not have access to it.'
    );

    for (const env of ["production", "development", undefined]) {
      it(`renders the catalogue text with NODE_ENV=${String(env)}`, () => {
        vi.stubEnv("NODE_ENV", env);
        const out = toClientErrorMessage(MARKED);

        expect(out).not.toBe(GENERIC_TRANSLATION_ERROR);
        expect(out).toContain("`model`");
      });
    }

    it("never lets the detail through — the model name stays out of the browser", () => {
      vi.stubEnv("NODE_ENV", "production");
      const out = toClientErrorMessage(MARKED);

      expect(out).not.toBe(GENERIC_TRANSLATION_ERROR);
      expect(out).not.toContain("gpt-5.4-mini");
      expect(out).not.toContain("does not exist");
      expect(out).not.toContain("[translator:");
    });

    it("does not treat a message that merely mentions the marker as marked", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(toClientErrorMessage(`429 rate limit — ${MARKED}`)).toBe(GENERIC_TRANSLATION_ERROR);
    });
  });
});
