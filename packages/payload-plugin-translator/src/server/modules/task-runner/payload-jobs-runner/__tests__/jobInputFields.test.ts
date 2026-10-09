import { describe, it, expect, vi } from "vitest";
import type { Config } from "payload";

import { createPayloadJobsRunner } from "../PayloadJobsRunnerProvider.js";
import type { TaskRunnerContext } from "../../TaskRunnerProvider.interface.js";
import baseline from "./jobInputFields.baseline.json";

/**
 * The field lists Payload is handed, recorded from the code that wrote them out by hand.
 *
 * They reach a host's generated `payload-types.ts`, so a change here changes a type in someone
 * else's repository. The recorded values are the only thing that can say whether a rewrite of how
 * they are produced kept them identical.
 */
const context: TaskRunnerContext = {
  handler: vi.fn(),
  report: vi.fn().mockResolvedValue(undefined),
  collections: ["posts", "docs"],
};

const names = (fields: unknown) => (fields as Array<{ name?: string }>).map((field) => field.name);

const registered = () => {
  const config = { jobs: {} } as unknown as Config;
  createPayloadJobsRunner().configure(context)(config);
  return {
    task: config.jobs?.tasks?.[0]?.inputSchema,
    workflow: config.jobs?.workflows?.[0]?.inputSchema,
  };
};

describe("the field lists handed to Payload", () => {
  it("describes the task exactly as recorded", () => {
    expect(registered().task).toEqual(baseline.task);
  });

  it("describes the workflow exactly as recorded", () => {
    expect(registered().workflow).toEqual(baseline.workflow);
  });

  it("names the run's locale list only on the workflow, and one locale only on the task", () => {
    const { task, workflow } = registered();

    expect(names(task)).toContain("target_lng");
    expect(names(task)).not.toContain("target_lngs");
    expect(names(workflow)).toContain("target_lngs");
    expect(names(workflow)).not.toContain("target_lng");
  });
});
