import { describe, it, expect, vi } from "vitest";
import type { CollectionSlug } from "payload";
import { withQueuedNotification } from "./withQueuedNotification";
import { LifecycleNotifier } from "./LifecycleNotifier";
import type { TaskRunner } from "../task-runner/TaskRunner.interface";
import type { TaskInput } from "../task-runner/types";

const makeRunner = (): TaskRunner => ({
  enqueue: vi.fn().mockResolvedValue(undefined),
  cancel: vi.fn().mockResolvedValue(undefined),
  run: vi.fn().mockResolvedValue({ success: true }),
  findByCollection: vi.fn().mockResolvedValue([]),
});

const input = (id: string): TaskInput => ({
  collectionSlug: "posts" as CollectionSlug,
  collectionId: id,
  sourceLng: "en",
  targetLng: "de",
  strategy: "overwrite",
  publishOnTranslation: false,
});

describe("withQueuedNotification", () => {
  it("fires queued for each task (mapped to TranslationTask) then delegates enqueue", async () => {
    const runner = makeRunner();
    const onQueued = vi.fn();
    const notifier = new LifecycleNotifier({ onQueued }, { error: vi.fn() });

    const wrapped = withQueuedNotification(runner, notifier);
    await wrapped.enqueue([input("1"), input("2")]);

    expect(onQueued).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ collection: "posts", id: "1", sourceLng: "en", targetLng: "de" })
    );
    expect(onQueued).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: "2" }));
    expect(runner.enqueue).toHaveBeenCalledWith([input("1"), input("2")]);
  });

  it("fires queued BEFORE delegating to the runner (ordering vs a synchronous runner)", async () => {
    const calls: string[] = [];
    const runner = makeRunner();
    (runner.enqueue as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      calls.push("enqueue");
    });
    const notifier = new LifecycleNotifier(
      {
        onQueued: () => {
          calls.push("queued");
        },
      },
      { error: vi.fn() }
    );

    await withQueuedNotification(runner, notifier).enqueue([input("1")]);

    expect(calls).toEqual(["queued", "enqueue"]);
  });

  it("delegates cancel / run / findByCollection unchanged", async () => {
    const runner = makeRunner();
    const wrapped = withQueuedNotification(runner, new LifecycleNotifier({}, { error: vi.fn() }));

    await wrapped.cancel(["a"]);
    await wrapped.run("b");
    await wrapped.findByCollection("posts" as CollectionSlug, ["c"]);

    expect(runner.cancel).toHaveBeenCalledWith(["a"]);
    expect(runner.run).toHaveBeenCalledWith("b");
    expect(runner.findByCollection).toHaveBeenCalledWith("posts", ["c"]);
  });
});
