import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload } from "payload";

import { PayloadJobsTaskRunner } from "./PayloadJobsTaskRunner";
import type { PayloadJobsRunnerConfig } from "./types";

describe("PayloadJobsTaskRunner — cancel reaches only the plugin's own jobs", () => {
  let payload: Payload & { jobs: { cancel: ReturnType<typeof vi.fn> } };
  let runner: PayloadJobsTaskRunner;

  beforeEach(() => {
    payload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      delete: vi.fn().mockResolvedValue(undefined),
      jobs: { cancel: vi.fn().mockResolvedValue(undefined) },
    } as unknown as Payload & { jobs: { cancel: ReturnType<typeof vi.fn> } };

    const config: PayloadJobsRunnerConfig = {
      taskName: "translate_document",
      workflowName: "translate_document_locales",
      queueName: "translations",
      jobsCollection: "payload-jobs",
      staleJobTimeoutMs: 60_000,
    } as PayloadJobsRunnerConfig;

    runner = new PayloadJobsTaskRunner(payload, config);
  });

  // The delete that follows is already scoped by `ownJobs()`. The cancel is not — it narrows by id
  // and queue only, so an id belonging to a host's own job on the same queue is marked cancelled.
  it("narrows the cancel by the plugin's own slugs, not by queue alone", async () => {
    await runner.cancel(["job-1"]);

    const [args] = payload.jobs.cancel.mock.calls[0] as [{ where: unknown }];
    expect(JSON.stringify(args.where)).toContain("translate_document_locales");
  });

  it("still narrows it by the ids it was given", async () => {
    await runner.cancel(["job-1", "job-2"]);

    const [args] = payload.jobs.cancel.mock.calls[0] as [{ where: unknown }];
    expect(JSON.stringify(args.where)).toContain("job-1");
    expect(JSON.stringify(args.where)).toContain("job-2");
  });
});
