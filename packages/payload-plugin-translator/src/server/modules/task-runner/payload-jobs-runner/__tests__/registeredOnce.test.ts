import { describe, it, expect, vi } from "vitest";
import type { Config, Payload } from "payload";

import { createPayloadJobsRunner } from "../PayloadJobsRunnerProvider.js";
import type { TaskRunnerContext } from "../../TaskRunnerProvider.interface.js";

const context: TaskRunnerContext = {
  handler: vi.fn(),
  report: vi.fn().mockResolvedValue(undefined),
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

  it("leaves one piece of boot work, not two", async () => {
    const update = vi.fn().mockResolvedValue({ docs: [] });
    const payload = { update, logger: { error: vi.fn() } } as unknown as Payload;

    await configuredTwice().onInit?.(payload);

    expect(
      update,
      "a second reclaim makes every boot pay for the same sweep twice"
    ).toHaveBeenCalledTimes(1);
  });
});

/*
 * The two registrations are de-duplicated under different keys, so a host that took the task slug
 * for itself would keep its own task and still receive this plugin's workflow. The workflow reads
 * a mark only this plugin's task writes, so it would answer for no locale at all.
 */
describe("a host that already registered a task under this plugin's slug", () => {
  const configuredAfter = (theirs: { slug: string }): Config => {
    const config = { jobs: { tasks: [theirs] } } as unknown as Config;
    createPayloadJobsRunner().configure(context)(config);
    return config;
  };

  it("keeps its own task", () => {
    const theirs = { slug: "translate_document", handler: vi.fn() };

    expect((configuredAfter(theirs).jobs?.tasks ?? []).map((task) => task.slug)).toEqual([
      "translate_document",
    ]);
  });

  it("is not given this plugin's workflow beside it", () => {
    const theirs = { slug: "translate_document", handler: vi.fn() };

    expect(configuredAfter(theirs).jobs?.workflows ?? []).toEqual([]);
  });
});

/*
 * The key was the run handle, and a handle is minted fresh for every enqueue, so no two rows ever
 * shared one. Payload excludes a job only from a key that is already running, so the declaration
 * excluded nothing. What it reads as protecting — two runs of one document at once — is refused
 * before the runner is asked.
 */
describe("the workflow declares no concurrency key", () => {
  const configuredWithTheFlag = (): Config => {
    const config = { jobs: { enableConcurrencyControl: true } } as unknown as Config;
    createPayloadJobsRunner().configure(context)(config);
    return config;
  };

  it("declares none even where the host enabled the feature", () => {
    const workflows = configuredWithTheFlag().jobs?.workflows ?? [];

    expect(workflows.map((workflow) => "concurrency" in workflow)).toEqual([false]);
  });

  it("leaves the feature itself as the host left it", () => {
    const config = { jobs: {} } as unknown as Config;
    createPayloadJobsRunner().configure(context)(config);

    expect(
      config.jobs?.enableConcurrencyControl,
      "turning the host's own control on would serialise work this plugin never asked to serialise"
    ).toBeUndefined();
  });
});
