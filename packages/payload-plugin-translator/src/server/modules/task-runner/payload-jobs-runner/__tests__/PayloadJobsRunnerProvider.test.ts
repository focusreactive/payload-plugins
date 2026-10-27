import { describe, it, expect, vi } from "vitest";
import type { Config } from "payload";
import { createPayloadJobsRunner } from "../PayloadJobsRunnerProvider.js";
import type { TaskRunnerContext } from "../../TaskRunnerProvider.interface.js";

const minimalContext: TaskRunnerContext = {
  handler: vi.fn(),
  report: vi.fn().mockResolvedValue(undefined),
};

// The config modifier only reads/writes `jobs` and `onInit`; build a minimal
// stand-in rather than a full Payload Config (which requires db, secret, etc.).
const makeConfig = (over: Record<string, unknown> = {}): Config =>
  ({ jobs: {}, ...over }) as unknown as Config;

const makePayload = (overrides?: { update?: ReturnType<typeof vi.fn> }) => ({
  update: overrides?.update ?? vi.fn().mockResolvedValue({ docs: [] }),
  logger: { error: vi.fn() },
});

const workflowOf = (config: Config) =>
  (config.jobs?.workflows ?? []).find(
    (w) => w.slug === "translate_document_locales"
  ) as unknown as {
    concurrency?: { key: (a: never) => string; exclusive?: boolean };
  };

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
      expect(() => createPayloadJobsRunner({ staleJobTimeoutMs: 0 })).toThrow(
        "[payload-plugin-translator] staleJobTimeoutMs must be a positive finite number"
      );
    });

    it("throws on staleJobTimeoutMs = -1", () => {
      expect(() => createPayloadJobsRunner({ staleJobTimeoutMs: -1 })).toThrow(
        "[payload-plugin-translator] staleJobTimeoutMs must be a positive finite number"
      );
    });

    it("throws on staleJobTimeoutMs = Infinity", () => {
      expect(() => createPayloadJobsRunner({ staleJobTimeoutMs: Infinity })).toThrow(
        "[payload-plugin-translator] staleJobTimeoutMs must be a positive finite number"
      );
    });

    it("does not throw with the default (300000)", () => {
      expect(() => createPayloadJobsRunner()).not.toThrow();
    });

    it("does not throw with a valid positive finite value", () => {
      expect(() => createPayloadJobsRunner({ staleJobTimeoutMs: 60_000 })).not.toThrow();
    });
  });

  describe("the workflow's concurrency declaration", () => {
    it("is absent when the host has not enabled concurrency control", () => {
      const config = createPayloadJobsRunner().configure(minimalContext)(makeConfig());

      expect(workflowOf(config).concurrency).toBeUndefined();
    });

    it("does not enable the host's concurrency control on its behalf", () => {
      const config = createPayloadJobsRunner().configure(minimalContext)(makeConfig());

      expect(config.jobs?.enableConcurrencyControl).toBeUndefined();
    });

    it("keys on the run when the host has enabled it", () => {
      const config = createPayloadJobsRunner().configure(minimalContext)(
        makeConfig({ jobs: { enableConcurrencyControl: true } })
      );

      const concurrency = workflowOf(config).concurrency;
      expect(concurrency?.exclusive).toBe(true);
      expect(
        concurrency?.key({ input: { handle: "run-1" } } as never),
        "one run per document is the plugin's rule now, so the queue only has to serialise a run"
      ).toBe("run-1");
    });
  });

  describe("the pointer the registered task hands on", () => {
    const runTask = (handler: TaskRunnerContext["handler"], input: unknown) => {
      const config = createPayloadJobsRunner().configure({ ...minimalContext, handler })(
        makeConfig()
      );
      const task = (config.jobs?.tasks ?? []).find(
        (candidate) => candidate.slug === "translate_document"
      );
      if (!task) throw new Error("the translate task was not registered");
      return (task.handler as unknown as (args: unknown) => Promise<unknown>)({
        req: { payload: {} },
        job: { id: 42 },
        input,
      });
    };

    it("hands on the handle and the locale the job row names, and nothing else", async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      await runTask(handler, { handle: "run-1", target_lng: "de" });

      expect(handler.mock.calls[0][1]).toEqual({
        handle: "run-1",
        targetLng: "de",
        previousAttempts: 0,
      });
    });

    it("names no document, because the record is where the run's facts live", async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      await runTask(handler, { handle: "run-1", target_lng: "de" });

      expect(Object.keys(handler.mock.calls[0][1]).sort()).toEqual([
        "handle",
        "previousAttempts",
        "targetLng",
      ]);
    });
  });
});
