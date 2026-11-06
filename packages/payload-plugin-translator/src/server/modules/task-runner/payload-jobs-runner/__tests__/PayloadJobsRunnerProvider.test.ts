import { describe, it, expect, vi, beforeAll } from "vitest";
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
  describe("when the run gives up part-way down its locale list", () => {
    const TASK = "translate_document";
    const WORKFLOW = "translate_document_locales";
    const RETRIES_EXHAUSTED = 3;

    type Told = { targetLng: string; event: { state: string; error?: unknown } };

    /**
     * Runs the registered task and workflow handlers against each other: the give-up decision lives
     * in the workflow's `catch`, and only a throw raised inside the real task reaches it.
     */
    const giveUpOn = async (args: { locales: string[]; failOn: string; delivered?: string[] }) => {
      const refusal = new Error("the model refused");
      const told: Told[] = [];
      const context: TaskRunnerContext = {
        handler: vi.fn(async (_payload: unknown, input: { targetLng: string }) => {
          if (input.targetLng === args.failOn) throw refusal;
        }),
        report: vi.fn(
          async (_payload: unknown, run: { targetLng: string }, event: Told["event"]) => {
            told.push({ targetLng: run.targetLng, event });
          }
        ),
      } as unknown as TaskRunnerContext;

      const config = createPayloadJobsRunner().configure(context)(makeConfig());
      const registered = config.jobs as unknown as {
        tasks: { slug: string; handler: (a: unknown) => Promise<unknown> }[];
        workflows: { slug: string; handler: (a: unknown) => Promise<unknown> }[];
      };
      const task = registered.tasks.find((t) => t.slug === TASK)!;
      const workflow = registered.workflows.find((w) => w.slug === WORKFLOW)!;

      const job = {
        id: "job-1",
        input: { handle: "run-1", locales: args.locales },
        taskStatus: { [TASK]: { [args.failOn]: { totalTried: RETRIES_EXHAUSTED } } },
        log: (args.delivered ?? []).map((locale) => ({
          state: "succeeded",
          input: { target_lng: locale },
        })),
      };
      const req = { payload: makePayload() };
      const tasks = {
        [TASK]: async (_id: string, { input }: { input: unknown }) =>
          await task.handler({ job, req, input }),
      };

      await expect(workflow.handler({ job, req, tasks })).rejects.toBe(refusal);
      return { told, refusal };
    };

    let told: Told[];
    let refusal: Error;

    beforeAll(async () => {
      ({ told, refusal } = await giveUpOn({
        locales: ["de", "fr", "es"],
        failOn: "fr",
        delivered: ["de"],
      }));
    });

    it("settles the locale that threw as failed, with its own error", () => {
      expect(told.find((t) => t.targetLng === "fr")?.event).toEqual({
        state: "failed",
        error: refusal,
      });
    });

    it("settles a locale it never reached as abandoned, not failed", () => {
      expect(told.find((t) => t.targetLng === "es")?.event).toEqual({ state: "abandoned" });
    });

    it("gives an abandoned locale no reason, because nothing was asked about it", () => {
      const es = told.find((t) => t.targetLng === "es")!;
      expect(Object.keys(es.event)).toEqual(["state"]);
    });
  });
});
