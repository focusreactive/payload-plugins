import { describe, it, expect, vi } from "vitest";
import { LifecycleNotifier } from "./LifecycleNotifier.js";
import type { TranslationTask } from "./types.js";

const task: TranslationTask = {
  collection: "posts",
  id: "doc-1",
  sourceLng: "en",
  targetLng: "de",
  strategy: "overwrite",
};

const makeLogger = () => ({ error: vi.fn() });

describe("LifecycleNotifier", () => {
  it("invokes onQueued with the task", async () => {
    const onQueued = vi.fn();
    await new LifecycleNotifier({ onQueued }, makeLogger()).queued(task);
    expect(onQueued).toHaveBeenCalledWith(task);
  });

  it("invokes onCompleted with the task", async () => {
    const onCompleted = vi.fn();
    await new LifecycleNotifier({ onCompleted }, makeLogger()).completed(task);
    expect(onCompleted).toHaveBeenCalledWith(task);
  });

  it("invokes onFailed with the task and the error", async () => {
    const onFailed = vi.fn();
    const error = new Error("boom");
    await new LifecycleNotifier({ onFailed }, makeLogger()).failed(task, error);
    expect(onFailed).toHaveBeenCalledWith(task, error);
  });

  it("is a no-op (no throw, no log) when the callback is absent", async () => {
    const logger = makeLogger();
    await expect(new LifecycleNotifier({}, logger).queued(task)).resolves.toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("swallows and logs a synchronous throw from a callback", async () => {
    const logger = makeLogger();
    const notifier = new LifecycleNotifier(
      {
        onQueued: () => {
          throw new Error("sync boom");
        },
      },
      logger
    );
    await expect(notifier.queued(task)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("swallows and logs an async rejection from a callback", async () => {
    const logger = makeLogger();
    const notifier = new LifecycleNotifier(
      { onCompleted: () => Promise.reject(new Error("async boom")) },
      logger
    );
    await expect(notifier.completed(task)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("swallows and logs a synchronous throw from an onFailed callback", async () => {
    const logger = makeLogger();
    const error = new Error("boom");
    const notifier = new LifecycleNotifier(
      {
        onFailed: () => {
          throw new Error("sync boom");
        },
      },
      logger
    );
    await expect(notifier.failed(task, error)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("swallows and logs an async rejection from an onFailed callback", async () => {
    const logger = makeLogger();
    const error = new Error("boom");
    const notifier = new LifecycleNotifier(
      { onFailed: () => Promise.reject(new Error("async boom")) },
      logger
    );
    await expect(notifier.failed(task, error)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("awaits an async callback before resolving", async () => {
    let done = false;
    const notifier = new LifecycleNotifier(
      {
        onQueued: async () => {
          await Promise.resolve();
          done = true;
        },
      },
      makeLogger()
    );
    await notifier.queued(task);
    expect(done).toBe(true);
  });
});

describe("LifecycleNotifier — a failure with no onFailed configured", () => {
  it("logs the failure", async () => {
    const logger = makeLogger();
    const error = new Error("provider unreachable");

    await new LifecycleNotifier({}, logger).failed(task, error);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ err: error }));
  });

  it("names the document and the locale it failed for", async () => {
    const logger = makeLogger();

    await new LifecycleNotifier({}, logger).failed(task, new Error("boom"));

    const logged = logger.error.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(logged).toMatchObject({ collection: "posts", id: "doc-1", targetLng: "de" });
  });

  it("does not log when a configured onFailed handled it", async () => {
    const logger = makeLogger();
    const onFailed = vi.fn();

    await new LifecycleNotifier({ onFailed }, logger).failed(task, new Error("boom"));

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
