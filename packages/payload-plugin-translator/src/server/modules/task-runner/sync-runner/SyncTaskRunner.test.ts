import type { Payload, CollectionSlug } from "payload";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { LazyMap } from "../../../shared/utils";
import type { TaskHandler } from "../TaskRunnerProvider.interface";
import type { TaskInput, Task } from "../types";
import { SyncTaskRunner } from "./SyncTaskRunner";

describe("SyncTaskRunner", () => {
  let mockPayload: Payload;
  let mockHandler: TaskHandler;
  let tasks: LazyMap<string, Task>;
  let runner: SyncTaskRunner;

  beforeEach(() => {
    mockPayload = {} as Payload;
    mockHandler = vi.fn().mockResolvedValue();
    tasks = new LazyMap<string, Task>({
      getTimestamp: (task) => new Date(task.updatedAt).getTime(),
      isRemovable: (task) =>
        task.status === "completed" || task.status === "failed",
    });
    runner = new SyncTaskRunner(mockPayload, mockHandler, tasks);
  });

  const createInput = (overrides: Partial<TaskInput> = {}): TaskInput => ({
    collectionId: "doc-123",
    collectionSlug: "posts" as CollectionSlug,
    publishOnTranslation: false,
    sourceLng: "en",
    strategy: "overwrite",
    targetLng: "de",
    ...overrides,
  });

  describe("enqueue", () => {
    it("executes handler immediately", async () => {
      const input = createInput();
      await runner.enqueue([input]);

      expect(mockHandler).toHaveBeenCalledWith(mockPayload, {
        collection: "posts",
        collectionId: "doc-123",
        publishOnTranslation: false,
        sourceLng: "en",
        strategy: "overwrite",
        targetLng: "de",
      });
    });

    it("stores completed task in tasks map", async () => {
      const input = createInput();
      await runner.enqueue([input]);

      const task = tasks.get("posts:doc-123");
      expect(task).toBeDefined();
      expect(task?.status).toBe("completed");
      expect(task?.completedAt).toBeDefined();
    });

    it("stores failed task when handler throws", async () => {
      mockHandler = vi.fn().mockRejectedValue(new Error("Translation failed"));
      runner = new SyncTaskRunner(mockPayload, mockHandler, tasks);

      const input = createInput();
      await runner.enqueue([input]);

      const task = tasks.get("posts:doc-123");
      expect(task?.status).toBe("failed");
      expect(task?.error?.message).toBe("Translation failed");
    });

    it("handles non-Error throws", async () => {
      mockHandler = vi.fn().mockRejectedValue("string error");
      runner = new SyncTaskRunner(mockPayload, mockHandler, tasks);

      const input = createInput();
      await runner.enqueue([input]);

      const task = tasks.get("posts:doc-123");
      expect(task?.status).toBe("failed");
      expect(task?.error?.message).toBe("Unknown error");
    });

    it("processes multiple inputs sequentially", async () => {
      const inputs = [
        createInput({ collectionId: "doc-1" }),
        createInput({ collectionId: "doc-2" }),
        createInput({ collectionId: "doc-3" }),
      ];

      await runner.enqueue(inputs);

      expect(mockHandler).toHaveBeenCalledTimes(3);
      expect(tasks.get("posts:doc-1")?.status).toBe("completed");
      expect(tasks.get("posts:doc-2")?.status).toBe("completed");
      expect(tasks.get("posts:doc-3")?.status).toBe("completed");
    });

    it("creates task with unique id", async () => {
      const inputs = [
        createInput({ collectionId: "doc-1" }),
        createInput({ collectionId: "doc-2" }),
      ];

      await runner.enqueue(inputs);

      const task1 = tasks.get("posts:doc-1");
      const task2 = tasks.get("posts:doc-2");
      expect(task1?.id).not.toBe(task2?.id);
    });

    it("sets cancelled to false", async () => {
      const input = createInput();
      await runner.enqueue([input]);

      const task = tasks.get("posts:doc-123");
      expect(task?.cancelled).toBe(false);
    });

    it("overwrites existing task for same document", async () => {
      const input = createInput();
      await runner.enqueue([input]);

      const firstTaskId = tasks.get("posts:doc-123")?.id;

      await runner.enqueue([input]);

      const secondTaskId = tasks.get("posts:doc-123")?.id;
      expect(secondTaskId).not.toBe(firstTaskId);
    });
  });

  describe("cancel", () => {
    it("is a no-op (sync tasks cannot be cancelled)", async () => {
      const input = createInput();
      await runner.enqueue([input]);

      const taskId = tasks.get("posts:doc-123")?.id;
      await runner.cancel([taskId!]);

      // Task should still exist and be completed
      expect(tasks.get("posts:doc-123")?.status).toBe("completed");
    });
  });

  describe("run", () => {
    it("returns not_found error (sync tasks run immediately)", async () => {
      const result = await runner.run("some-task-id");
      expect(result).toEqual({ error: "not_found", success: false });
    });
  });

  describe("findByCollection", () => {
    it("returns tasks for collection", async () => {
      await runner.enqueue([
        createInput({
          collectionId: "doc-1",
          collectionSlug: "posts" as CollectionSlug,
        }),
        createInput({
          collectionId: "doc-2",
          collectionSlug: "posts" as CollectionSlug,
        }),
        createInput({
          collectionId: "doc-3",
          collectionSlug: "pages" as CollectionSlug,
        }),
      ]);

      const postTasks = await runner.findByCollection(
        "posts" as CollectionSlug
      );
      expect(postTasks).toHaveLength(2);
      expect(postTasks.every((t) => t.input.collectionSlug === "posts")).toBe(
        true
      );
    });

    it("filters by documentIds when provided", async () => {
      await runner.enqueue([
        createInput({ collectionId: "doc-1" }),
        createInput({ collectionId: "doc-2" }),
        createInput({ collectionId: "doc-3" }),
      ]);

      const filteredTasks = await runner.findByCollection(
        "posts" as CollectionSlug,
        ["doc-1", "doc-3"]
      );
      expect(filteredTasks).toHaveLength(2);
      expect(filteredTasks.map((t) => t.input.collectionId).toSorted()).toEqual([
        "doc-1",
        "doc-3",
      ]);
    });

    it("returns empty array when no tasks match", async () => {
      await runner.enqueue([createInput()]);

      const tasks = await runner.findByCollection("pages" as CollectionSlug);
      expect(tasks).toEqual([]);
    });

    it("returns empty array for empty documentIds", async () => {
      await runner.enqueue([createInput()]);

      const tasks = await runner.findByCollection(
        "posts" as CollectionSlug,
        []
      );
      expect(tasks).toEqual([]);
    });
  });
});
