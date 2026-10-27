import type { Config, Payload } from "payload";
import { describe, expect, it, vi } from "vitest";

import { createPayloadJobsRunner } from "../PayloadJobsRunnerProvider.js";
import type { TaskHandlerInput } from "../../TaskRunnerProvider.interface.js";
import type { TaskRunnerContext } from "../../TaskRunnerProvider.interface.js";

const TASK_SLUG = "translate_document";

const registeredTask = (handler: TaskRunnerContext["handler"]) => {
  const config = { jobs: {} } as unknown as Config;
  const context: TaskRunnerContext = {
    handler,
    report: vi.fn().mockResolvedValue(undefined),
  };
  createPayloadJobsRunner().configure(context)(config);
  const task = config.jobs?.tasks?.find((candidate) => candidate.slug === TASK_SLUG);
  if (!task) throw new Error("the translate task was not registered");
  return task;
};

const runTheTask = async (job: unknown): Promise<TaskHandlerInput> => {
  const handler = vi.fn().mockResolvedValue(undefined);
  const task = registeredTask(handler);

  await (task.handler as (args: unknown) => Promise<unknown>)({
    req: { payload: {} as Payload },
    job,
    input: {
      collection_slug: "posts",
      collection_id: "doc-1",
      source_lng: "en",
      target_lng: "de",
      publish_on_translation: false,
    },
  });

  return handler.mock.calls[0][1] as TaskHandlerInput;
};

describe("what a run is told about the attempt it is on", () => {
  it("says zero on a first run, where Payload has recorded nothing yet", async () => {
    expect((await runTheTask({ id: "job-1" })).previousAttempts).toBe(0);
  });

  it("says zero when the row exists but this locale has not been tried", async () => {
    expect((await runTheTask({ id: "job-1", taskStatus: {} })).previousAttempts).toBe(0);
  });

  it("says one on the first retry of that locale", async () => {
    const job = { id: "job-1", taskStatus: { [TASK_SLUG]: { de: { totalTried: 1 } } } };

    expect((await runTheTask(job)).previousAttempts).toBe(1);
  });

  it("counts the locale that is running, not a sibling locale of the same run", async () => {
    const job = { id: "job-1", taskStatus: { [TASK_SLUG]: { fr: { totalTried: 3 } } } };

    expect((await runTheTask(job)).previousAttempts).toBe(0);
  });
});
