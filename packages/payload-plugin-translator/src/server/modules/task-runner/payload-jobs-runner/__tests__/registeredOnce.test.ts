import { describe, it, expect, vi } from "vitest";
import type { Config } from "payload";

import { createPayloadJobsRunner } from "../PayloadJobsRunnerProvider.js";
import type { TaskRunnerContext } from "../../TaskRunnerProvider.interface.js";

const context: TaskRunnerContext = {
  handler: vi.fn(),
  report: vi.fn().mockResolvedValue(undefined),
  collections: ["posts"],
};

const configuredTwice = (): Config => {
  const config = { jobs: {} } as unknown as Config;
  createPayloadJobsRunner().configure(context)(config);
  createPayloadJobsRunner().configure(context)(config);
  return config;
};

/**
 * A host can end up applying the plugin twice — two instances for two collection sets, or a config
 * rebuilt. Payload does not catch it: it gathers slugs into a `Set` to validate and only objects
 * when a task slug collides with a workflow's, so a repeated registration passes in silence and the
 * queue ends up with two schedules polling it.
 */
describe("a plugin applied twice registers itself once", () => {
  it("registers one task", () => {
    const slugs = (configuredTwice().jobs?.tasks ?? []).map((task) => task.slug);

    expect(slugs).toEqual(["translate_document"]);
  });

  it("registers one workflow", () => {
    const slugs = (configuredTwice().jobs?.workflows ?? []).map((workflow) => workflow.slug);

    expect(slugs).toEqual(["translate_document_locales"]);
  });

  it("leaves one schedule polling the queue", () => {
    const autoRun = configuredTwice().jobs?.autoRun;

    expect(
      Array.isArray(autoRun) ? autoRun.map((entry) => entry.queue) : autoRun,
      "a second schedule on the same queue polls it twice as often"
    ).toEqual(["translations"]);
  });
});
