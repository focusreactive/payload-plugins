import { describe, it, expect, vi } from "vitest";
import type { CollectionSlug } from "payload";

import { withQueuedNotification } from "./withQueuedNotification.js";
import { LifecycleNotifier } from "./LifecycleNotifier.js";
import type { TaskRunner } from "../task-runner/TaskRunner.interface.js";
import type { Task } from "../task-runner/types.js";

const task = (targetLng: string, id = "job-77"): Task => ({
  id,
  status: "pending",
  input: {
    collectionSlug: "posts" as CollectionSlug,
    collectionId: "doc-1",
    sourceLng: "en",
    targetLng,
    strategy: "overwrite",
    publishOnTranslation: false,
  },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  cancelled: false,
});

const makeRunner = (overrides: Partial<TaskRunner> = {}): TaskRunner => ({
  enqueue: vi.fn().mockResolvedValue(undefined),
  cancel: vi.fn().mockResolvedValue(undefined),
  run: vi.fn().mockResolvedValue({ success: true }),
  findByCollection: vi.fn().mockResolvedValue([]),
  ...overrides,
});

describe("cancelling tells the host what stopped", () => {
  it("fires once per target locale the cancelled job covered", async () => {
    const onCancelled = vi.fn();
    const runner = makeRunner({
      findByIds: vi.fn().mockResolvedValue([task("de"), task("fr"), task("it")]),
    });

    await withQueuedNotification(
      runner,
      new LifecycleNotifier({ onCancelled }, { error: vi.fn() })
    ).cancel(["job-77"]);

    expect(
      onCancelled.mock.calls.map(([t]) => t.targetLng),
      "one row covers a list of locales, and each is a translation the host was tracking"
    ).toEqual(["de", "fr", "it"]);
    expect(onCancelled.mock.calls[0][0]).toMatchObject({
      collection: "posts",
      id: "doc-1",
      jobId: "job-77",
    });
  });

  it("fires before the job row is deleted, so a host can still read it", async () => {
    const order: string[] = [];
    const onCancelled = vi.fn(() => {
      order.push("callback");
    });
    const runner = makeRunner({
      findByIds: vi.fn().mockResolvedValue([task("de")]),
      cancel: vi.fn(async () => {
        order.push("cancel");
      }),
    });

    await withQueuedNotification(
      runner,
      new LifecycleNotifier({ onCancelled }, { error: vi.fn() })
    ).cancel(["job-77"]);

    expect(order).toEqual(["callback", "cancel"]);
  });

  it("stays quiet about a locale the job already finished", async () => {
    const onCancelled = vi.fn();
    const halfDone = { ...task("de"), status: "completed" as const };
    const runner = makeRunner({
      findByIds: vi.fn().mockResolvedValue([halfDone, task("fr")]),
    });

    await withQueuedNotification(
      runner,
      new LifecycleNotifier({ onCancelled }, { error: vi.fn() })
    ).cancel(["job-77"]);

    expect(
      onCancelled.mock.calls.map(([t]) => t.targetLng),
      "de is not stopping — the host already had its completed callback for it"
    ).toEqual(["fr"]);
  });

  it("says nothing for an id that resolves to no job of ours", async () => {
    const onCancelled = vi.fn();
    const runner = makeRunner({ findByIds: vi.fn().mockResolvedValue([]) });

    await withQueuedNotification(
      runner,
      new LifecycleNotifier({ onCancelled }, { error: vi.fn() })
    ).cancel(["not-ours"]);

    expect(onCancelled).not.toHaveBeenCalled();
    expect(runner.cancel, "the cancel itself still happens").toHaveBeenCalledWith(["not-ours"]);
  });

  it("still cancels, silently, for a runner that cannot resolve ids", async () => {
    const onCancelled = vi.fn();
    const runner = makeRunner();

    await withQueuedNotification(
      runner,
      new LifecycleNotifier({ onCancelled }, { error: vi.fn() })
    ).cancel(["job-77"]);

    expect(onCancelled).not.toHaveBeenCalled();
    expect(runner.cancel).toHaveBeenCalledWith(["job-77"]);
  });

  it("keeps the read available to anyone downstream, like every other method it wraps", () => {
    const findByIds = vi.fn().mockResolvedValue([]);
    const decorated = withQueuedNotification(
      makeRunner({ findByIds }),
      new LifecycleNotifier({}, { error: vi.fn() })
    );

    expect(decorated.findByIds, "decorating must not quietly remove a capability").toBeDefined();
  });

  it("stays absent when the runner it wraps has none, so the optionality survives", () => {
    const decorated = withQueuedNotification(
      makeRunner(),
      new LifecycleNotifier({}, { error: vi.fn() })
    );

    expect(decorated.findByIds).toBeUndefined();
  });

  it("does not let a failed read stop the cancellation", async () => {
    const onCancelled = vi.fn();
    const runner = makeRunner({
      findByIds: vi.fn().mockRejectedValue(new Error("sidecar down")),
    });

    await expect(
      withQueuedNotification(
        runner,
        new LifecycleNotifier({ onCancelled }, { error: vi.fn() })
      ).cancel(["job-77"])
    ).resolves.toBeUndefined();

    expect(runner.cancel).toHaveBeenCalledWith(["job-77"]);
  });

  it("logs the failed read, so silence is not mistaken for nothing to announce", async () => {
    const error = vi.fn();
    const runner = makeRunner({
      findByIds: vi.fn().mockRejectedValue(new Error("sidecar down")),
    });

    await withQueuedNotification(
      runner,
      new LifecycleNotifier({ onCancelled: vi.fn() }, { error })
    ).cancel(["job-77"]);

    expect(
      error,
      "a host that registered onCancelled and heard nothing cannot tell a broken read from an id that was not ours"
    ).toHaveBeenCalledWith(expect.objectContaining({ err: expect.any(Error) }));
  });
});
