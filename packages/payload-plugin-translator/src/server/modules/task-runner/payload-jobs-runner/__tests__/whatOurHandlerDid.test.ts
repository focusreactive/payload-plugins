import type { Config, Payload } from "payload";
import { describe, expect, it, vi } from "vitest";

import { createPayloadJobsRunner } from "../PayloadJobsRunnerProvider.js";
import type { TaskRunnerContext } from "../../TaskRunnerProvider.interface.js";

const WORKFLOW_SLUG = "translate_document_locales";

type WorkflowArgs = {
  job: unknown;
  req: { payload: Payload };
  tasks: Record<string, (id: string, args: unknown) => Promise<unknown>>;
};

const runTheWorkflow = async (runTask: () => Promise<never>) => {
  const config = { jobs: {} } as unknown as Config;
  const report = vi.fn().mockResolvedValue(undefined);
  const context: TaskRunnerContext = {
    handler: vi.fn().mockResolvedValue(undefined),
    report,
  };
  createPayloadJobsRunner().configure(context)(config);
  const workflow = config.jobs?.workflows?.find((one) => one.slug === WORKFLOW_SLUG);
  if (!workflow) throw new Error("the locale workflow was not registered");

  const args: WorkflowArgs = {
    job: { id: "job-1", input: { handle: "run-1", locales: ["de"] } },
    req: { payload: { logger: { warn: vi.fn() } } as unknown as Payload },
    tasks: { translate_document: runTask },
  };
  const raised = await (workflow.handler as (a: unknown) => Promise<unknown>)(args).then(
    () => null,
    (error: unknown) => error
  );
  return { raised, report };
};

/*
 * The queue can fail before this plugin's handler is reached at all — it may not resolve the
 * handler, or a host's own restore hook may throw. Nothing was translated then, and the locale
 * must not be answered for.
 */
describe("a failure raised before the plugin's own handler runs", () => {
  const theQueueFellOverFirst = new Error("task handler could not be resolved");

  it("is passed on untouched", async () => {
    const { raised } = await runTheWorkflow(() => Promise.reject(theQueueFellOverFirst));

    expect(raised).toBe(theQueueFellOverFirst);
  });

  it("leaves the locale unanswered rather than calling it translated", async () => {
    const { report } = await runTheWorkflow(() => Promise.reject(theQueueFellOverFirst));

    expect(report).not.toHaveBeenCalled();
  });
});
