import { describe, it, expect, vi } from "vitest";
import type { Config } from "payload";
import { createPayloadJobsRunner } from "./PayloadJobsRunnerProvider";
import type { TaskRunnerContext } from "../TaskRunnerProvider.interface";

const minimalContext: TaskRunnerContext = {
  handler: vi.fn(),
  collections: ["pages"],
};

// The config modifier only reads/writes `jobs` and `onInit`; build a minimal
// stand-in rather than a full Payload Config (which requires db, secret, etc.).
const makeConfig = (over: Record<string, unknown> = {}): Config => ({ jobs: {}, ...over }) as unknown as Config;

const makePayload = (overrides?: { update?: ReturnType<typeof vi.fn> }) => ({
  update: overrides?.update ?? vi.fn().mockResolvedValue({ docs: [] }),
  logger: { error: vi.fn() },
});

describe("PayloadJobsRunnerProvider", () => {
  describe("configure().onInit", () => {
    it("returns a config whose onInit is a function that triggers reclaim", async () => {
      const runner = createPayloadJobsRunner();
      const configure = runner.configure(minimalContext);
      const config = configure(makeConfig());

      expect(typeof config.onInit).toBe("function");

      const payload = makePayload();
      await config.onInit!(payload as never);

      expect(payload.update).toHaveBeenCalled();
    });

    it("preserves a pre-existing config.onInit and calls both", async () => {
      const existingSpy = vi.fn().mockResolvedValue(undefined);
      const runner = createPayloadJobsRunner();
      const configure = runner.configure(minimalContext);
      const config = configure(makeConfig({ onInit: existingSpy }));

      const payload = makePayload();
      await config.onInit!(payload as never);

      expect(existingSpy).toHaveBeenCalled();
      expect(payload.update).toHaveBeenCalled();
    });

    it("does not throw when reclaim fails — logs error instead", async () => {
      const runner = createPayloadJobsRunner();
      const configure = runner.configure(minimalContext);
      const failingUpdate = vi.fn().mockRejectedValue(new Error("db down"));
      const payload = makePayload({ update: failingUpdate });
      const config = configure(makeConfig());

      await expect(config.onInit!(payload as never)).resolves.toBeUndefined();
      expect(payload.logger.error).toHaveBeenCalled();
    });
  });

  describe("construction — staleJobTimeoutMs validation", () => {
    it("throws on staleJobTimeoutMs = 0", () => {
      expect(() => createPayloadJobsRunner({ staleJobTimeoutMs: 0 })).toThrow("[payload-plugin-translator] staleJobTimeoutMs must be a positive finite number");
    });

    it("throws on staleJobTimeoutMs = -1", () => {
      expect(() => createPayloadJobsRunner({ staleJobTimeoutMs: -1 })).toThrow("[payload-plugin-translator] staleJobTimeoutMs must be a positive finite number");
    });

    it("throws on staleJobTimeoutMs = Infinity", () => {
      expect(() => createPayloadJobsRunner({ staleJobTimeoutMs: Infinity })).toThrow("[payload-plugin-translator] staleJobTimeoutMs must be a positive finite number");
    });

    it("does not throw with the default (300000)", () => {
      expect(() => createPayloadJobsRunner()).not.toThrow();
    });

    it("does not throw with a valid positive finite value", () => {
      expect(() => createPayloadJobsRunner({ staleJobTimeoutMs: 60_000 })).not.toThrow();
    });
  });
});
