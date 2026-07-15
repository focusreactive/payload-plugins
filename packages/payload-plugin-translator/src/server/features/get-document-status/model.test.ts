import { describe, it, expect } from "vitest";
import type { CollectionSlug } from "payload";

import type { Task } from "../../modules/task-runner";

import { latestTaskPerTargetLocale } from "./model";

const task = (over: Partial<Task> & { targetLng: string; id: string }): Task => ({
  id: over.id,
  status: over.status ?? "pending",
  input: {
    collectionSlug: "posts" as CollectionSlug,
    collectionId: "doc-1",
    sourceLng: "en",
    targetLng: over.targetLng,
    strategy: "overwrite",
    publishOnTranslation: false,
  },
  createdAt: over.createdAt ?? "2024-01-01T00:00:00Z",
  updatedAt: over.updatedAt ?? "2024-01-01T00:00:00Z",
  cancelled: false,
});

describe("latestTaskPerTargetLocale", () => {
  it("returns one task per target locale", () => {
    const result = latestTaskPerTargetLocale([
      task({ id: "de", targetLng: "de" }),
      task({ id: "fr", targetLng: "fr" }),
    ]);
    expect(result.map((t) => t.input.targetLng).sort()).toEqual(["de", "fr"]);
  });

  it("keeps the most recently created task for a locale", () => {
    const result = latestTaskPerTargetLocale([
      task({ id: "old", targetLng: "de", createdAt: "2024-01-01T00:00:00Z" }),
      task({ id: "new", targetLng: "de", createdAt: "2024-01-02T00:00:00Z" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("new");
  });

  it("tie-breaks equal createdAt by the most recently updated task", () => {
    const result = latestTaskPerTargetLocale([
      task({
        id: "stale",
        targetLng: "de",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      }),
      task({
        id: "fresh",
        targetLng: "de",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T06:00:00Z",
      }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("fresh");
  });

  it("returns [] for no tasks", () => {
    expect(latestTaskPerTargetLocale([])).toEqual([]);
  });
});
