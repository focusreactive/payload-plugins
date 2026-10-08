import type { CollectionSlug } from "payload";
import { describe, expect, it, vi } from "vitest";
import type { TaskFilter, TaskRunner } from "../task-runner/TaskRunner.interface.js";
import type {
  EnqueueAssignment,
  RunResult,
  Task,
  TaskInput,
  TaskStatus,
} from "../task-runner/types.js";
import { LifecycleNotifier } from "./LifecycleNotifier.js";
import type { TranslationLifecycleCallbacks, TranslationTask } from "./types.js";
import { withQueuedNotification } from "./withQueuedNotification.js";

const makeLogger = () => ({ error: vi.fn() });

/** A notifier whose logger the test can read: a swallowed failure surfaces nowhere else. */
const notifierFor = (
  callbacks: TranslationLifecycleCallbacks,
  logger: { error: (obj: unknown) => void } = makeLogger()
) => new LifecycleNotifier(callbacks, logger);

const taskInput = (overrides: Partial<TaskInput> = {}): TaskInput => ({
  collectionSlug: "posts",
  collectionId: "doc-1",
  sourceLng: "en",
  targetLng: "de",
  strategy: "overwrite",
  publishOnTranslation: false,
  ...overrides,
});

const storedTask = (id: string, input: TaskInput, status: TaskStatus = "pending"): Task => ({
  id,
  status,
  input,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  cancelled: false,
});

/** The runner the wrapper goes around. `findByIds` is absent on purpose — it is the optional part
 * of the contract. */
const makeRunner = (parts: Partial<TaskRunner> = {}): TaskRunner => ({
  enqueue: vi.fn(async () => undefined),
  cancel: vi.fn(async () => undefined),
  run: vi.fn(async () => ({ success: true as const })),
  findByCollection: vi.fn(async () => []),
  ...parts,
});

describe("withQueuedNotification — enqueue", () => {
  it("raises queued for each task it was given", async () => {
    const onQueued = vi.fn();
    const tasks = [taskInput(), taskInput({ collectionId: "doc-2", targetLng: "fr" })];

    await withQueuedNotification(makeRunner(), notifierFor({ onQueued })).enqueue(tasks);

    expect(onQueued).toHaveBeenCalledTimes(2);
    expect(onQueued).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "posts", id: "doc-1", targetLng: "de" })
    );
    expect(onQueued).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "posts", id: "doc-2", targetLng: "fr" })
    );
  });

  it("answers with the handles the wrapped runner answered", async () => {
    const assignments: EnqueueAssignment[] = [
      { collectionSlug: "posts", collectionId: "doc-1", targetLng: "de", handle: "run-1" },
    ];
    const wrapped = makeRunner({ enqueue: vi.fn(async () => assignments) });

    const answer = await withQueuedNotification(wrapped, notifierFor({})).enqueue([taskInput()]);

    expect(answer).toEqual(assignments);
  });

  it("answers with nothing when the wrapped runner answered nothing", async () => {
    const enqueue = vi.fn(async () => undefined);

    const answer = await withQueuedNotification(makeRunner({ enqueue }), notifierFor({})).enqueue([
      taskInput(),
    ]);

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(answer).toBeUndefined();
  });

  it("asks the wrapped runner with the tasks and the scope it was given", async () => {
    const enqueue = vi.fn(async () => undefined);
    const tasks = [taskInput()];
    const scope = { transactionID: "tx-1" };

    await withQueuedNotification(makeRunner({ enqueue }), notifierFor({})).enqueue(tasks, scope);

    expect(enqueue).toHaveBeenCalledWith(tasks, scope);
  });

  it("raises queued for every task before the wrapped runner is asked", async () => {
    const order: string[] = [];
    const onQueued = vi.fn(() => {
      order.push("queued");
    });
    const enqueue = vi.fn(async () => {
      order.push("enqueue");
    });

    await withQueuedNotification(makeRunner({ enqueue }), notifierFor({ onQueued })).enqueue([
      taskInput(),
      taskInput({ targetLng: "fr" }),
    ]);

    expect(order).toEqual(["queued", "queued", "enqueue"]);
  });

  it("keeps queued ahead of a completed the runner reports from inside the enqueue call", async () => {
    const order: string[] = [];
    const notifier = notifierFor({
      onQueued: async () => {
        await Promise.resolve();
        order.push("queued");
      },
      onCompleted: () => {
        order.push("completed");
      },
    });
    const translated: TranslationTask = {
      collection: "posts",
      id: "doc-1",
      sourceLng: "en",
      targetLng: "de",
      strategy: "overwrite",
      handle: "run-1",
    };
    const enqueue = vi.fn(async () => {
      await notifier.completed(translated);
    });

    await withQueuedNotification(makeRunner({ enqueue }), notifier).enqueue([taskInput()]);

    expect(order).toEqual(["queued", "completed"]);
  });

  it("reports a queued task with no handle", async () => {
    const onQueued = vi.fn();
    const assignments: EnqueueAssignment[] = [
      { collectionSlug: "posts", collectionId: "doc-1", targetLng: "de", handle: "run-1" },
    ];
    const wrapped = makeRunner({ enqueue: vi.fn(async () => assignments) });

    await withQueuedNotification(wrapped, notifierFor({ onQueued })).enqueue([taskInput()]);

    expect(onQueued).toHaveBeenCalledTimes(1);
    const queued = onQueued.mock.calls[0]?.[0] as TranslationTask;
    expect(queued.handle).toBeUndefined();
  });
});

describe("withQueuedNotification — cancel", () => {
  it("announces, once per locale, what the cancelled runs still owed", async () => {
    const onCancelled = vi.fn();
    const owed = [storedTask("t1", taskInput()), storedTask("t2", taskInput({ targetLng: "fr" }))];
    const wrapped = makeRunner({ findByIds: vi.fn(async () => owed) });

    await withQueuedNotification(wrapped, notifierFor({ onCancelled })).cancel(["t1", "t2"]);

    expect(onCancelled).toHaveBeenCalledTimes(2);
    expect(onCancelled).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "posts",
        id: "doc-1",
        sourceLng: "en",
        targetLng: "de",
        strategy: "overwrite",
      })
    );
    expect(onCancelled).toHaveBeenCalledWith(expect.objectContaining({ targetLng: "fr" }));
  });

  it("reads the records of the handles it was given", async () => {
    const findByIds = vi.fn(async () => [storedTask("t1", taskInput())]);

    await withQueuedNotification(
      makeRunner({ findByIds }),
      notifierFor({ onCancelled: vi.fn() })
    ).cancel(["t1", "t2"]);

    expect(findByIds).toHaveBeenCalledWith(["t1", "t2"]);
  });

  it("announces before delegating the cancellation", async () => {
    const order: string[] = [];
    const cancel = vi.fn(async () => {
      order.push("cancel");
    });
    const findByIds = vi.fn(async () => [storedTask("t1", taskInput())]);
    const notifier = notifierFor({
      onCancelled: () => {
        order.push("cancelled");
      },
    });

    await withQueuedNotification(makeRunner({ cancel, findByIds }), notifier).cancel(["t1"]);

    expect(order).toEqual(["cancelled", "cancel"]);
  });

  it("lets an announcement finish before delegating the cancellation", async () => {
    const order: string[] = [];
    const cancel = vi.fn(async () => {
      order.push("cancel");
    });
    const findByIds = vi.fn(async () => [storedTask("t1", taskInput())]);
    // Settles on a timer, not a microtask: an announcement that is started but not awaited loses
    // this race.
    const notifier = notifierFor({
      onCancelled: () =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            order.push("cancelled");
            resolve();
          }, 10);
        }),
    });

    await withQueuedNotification(makeRunner({ cancel, findByIds }), notifier).cancel(["t1"]);

    expect(order).toEqual(["cancelled", "cancel"]);
  });

  it("announces the handle of the run being cancelled", async () => {
    const onCancelled = vi.fn();
    const records = [
      storedTask("run-1", taskInput()),
      storedTask("run-2", taskInput({ targetLng: "fr" })),
    ];
    const wrapped = makeRunner({ findByIds: vi.fn(async () => records) });

    await withQueuedNotification(wrapped, notifierFor({ onCancelled })).cancel(["run-1", "run-2"]);

    expect(onCancelled).toHaveBeenCalledWith(
      expect.objectContaining({ targetLng: "de", handle: "run-1" })
    );
    expect(onCancelled).toHaveBeenCalledWith(
      expect.objectContaining({ targetLng: "fr", handle: "run-2" })
    );
  });

  it("does not announce a locale the run had already translated", async () => {
    const onCancelled = vi.fn();
    const records = [
      storedTask("t1", taskInput(), "completed"),
      storedTask("t2", taskInput({ targetLng: "fr" })),
    ];
    const wrapped = makeRunner({ findByIds: vi.fn(async () => records) });

    await withQueuedNotification(wrapped, notifierFor({ onCancelled })).cancel(["t1", "t2"]);

    expect(onCancelled).toHaveBeenCalledTimes(1);
    expect(onCancelled).toHaveBeenCalledWith(expect.objectContaining({ targetLng: "fr" }));
  });

  it("cancels as before when the runner cannot resolve handles", async () => {
    const cancel = vi.fn(async () => undefined);

    const wrapper = withQueuedNotification(
      makeRunner({ cancel }),
      notifierFor({ onCancelled: vi.fn() })
    );

    await expect(wrapper.cancel(["t1", "t2"])).resolves.toBeUndefined();
    expect(cancel).toHaveBeenCalledWith(["t1", "t2"]);
  });

  it("announces nothing when the runner cannot resolve handles", async () => {
    const cancel = vi.fn(async () => undefined);
    const onCancelled = vi.fn();

    await withQueuedNotification(makeRunner({ cancel }), notifierFor({ onCancelled })).cancel([
      "t1",
    ]);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(onCancelled).not.toHaveBeenCalled();
  });

  it("does not ask a runner that cannot resolve handles to resolve them", async () => {
    const cancel = vi.fn(async () => undefined);
    const logger = makeLogger();

    await withQueuedNotification(
      makeRunner({ cancel }),
      notifierFor({ onCancelled: vi.fn() }, logger)
    ).cancel(["t1"]);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("swallows a read that fails, and still cancels", async () => {
    const cancel = vi.fn(async () => undefined);
    const findByIds = vi.fn(() => Promise.reject(new Error("database unreachable")));
    const wrapper = withQueuedNotification(
      makeRunner({ cancel, findByIds }),
      notifierFor({ onCancelled: vi.fn() })
    );

    await expect(wrapper.cancel(["t1"])).resolves.toBeUndefined();
    expect(findByIds).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith(["t1"]);
  });

  it("records a read that fails rather than passing it off as nothing to announce", async () => {
    const failure = new Error("database unreachable");
    const findByIds = vi.fn(() => Promise.reject(failure));
    const logger = makeLogger();

    await withQueuedNotification(
      makeRunner({ findByIds }),
      notifierFor({ onCancelled: vi.fn() }, logger)
    ).cancel(["t1"]);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ err: failure }));
  });

  it("still cancels when the host's onCancelled throws", async () => {
    const cancel = vi.fn(async () => undefined);
    const findByIds = vi.fn(async () => [storedTask("t1", taskInput())]);
    const notifier = notifierFor({
      onCancelled: () => {
        throw new Error("host blew up");
      },
    });
    const wrapper = withQueuedNotification(makeRunner({ cancel, findByIds }), notifier);

    await expect(wrapper.cancel(["t1"])).resolves.toBeUndefined();
    expect(cancel).toHaveBeenCalledWith(["t1"]);
  });
});

describe("withQueuedNotification — the methods that only pass through", () => {
  it("answers run exactly as the wrapped runner", async () => {
    const notFound: RunResult = { success: false, error: "not_found" };
    const run = vi.fn(async (taskId: string) =>
      taskId === "t1" ? notFound : { success: true as const }
    );

    const answer = await withQueuedNotification(makeRunner({ run }), notifierFor({})).run("t1");

    expect(answer).toEqual(notFound);
  });

  it("answers findByCollection exactly as the wrapped runner", async () => {
    const pending = [storedTask("t1", taskInput())];
    const findByCollection = vi.fn(
      async (_slug: CollectionSlug, filter?: TaskFilter | Array<string | number>) =>
        !Array.isArray(filter) && filter?.excludeCompleted ? pending : []
    );

    const answer = await withQueuedNotification(
      makeRunner({ findByCollection }),
      notifierFor({})
    ).findByCollection("posts", { excludeCompleted: true });

    expect(answer).toEqual(pending);
  });

  it("keeps the optional findByIds available to anything downstream", async () => {
    const owed = [storedTask("t1", taskInput())];
    const findByIds = vi.fn(async (taskIds: string[]) => (taskIds[0] === "t1" ? owed : []));
    const wrapper = withQueuedNotification(makeRunner({ findByIds }), notifierFor({}));

    expect(wrapper.findByIds).toBeDefined();
    await expect(wrapper.findByIds?.(["t1"])).resolves.toEqual(owed);
  });

  it("leaves findByIds absent when the wrapped runner cannot resolve handles", () => {
    const wrapper = withQueuedNotification(makeRunner(), notifierFor({}));

    expect(wrapper.findByIds).toBeUndefined();
  });

  it("tells the host nothing for the methods that only pass through", async () => {
    const callbacks = {
      onQueued: vi.fn(),
      onCompleted: vi.fn(),
      onFailed: vi.fn(),
      onCancelled: vi.fn(),
    };
    const run = vi.fn(async () => ({ success: true as const }));
    const findByCollection = vi.fn(async () => []);
    const findByIds = vi.fn(async () => []);
    const wrapper = withQueuedNotification(
      makeRunner({ run, findByCollection, findByIds }),
      notifierFor(callbacks)
    );

    await wrapper.run("t1");
    await wrapper.findByCollection("posts");
    await wrapper.findByIds?.(["t1"]);

    expect(run).toHaveBeenCalledTimes(1);
    expect(findByCollection).toHaveBeenCalledTimes(1);
    expect(findByIds).toHaveBeenCalledTimes(1);
    for (const callback of Object.values(callbacks)) {
      expect(callback).not.toHaveBeenCalled();
    }
  });
});
