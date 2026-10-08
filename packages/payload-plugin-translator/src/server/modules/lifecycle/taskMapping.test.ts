import { describe, it, expect } from "vitest";
import type { TaskInput } from "../task-runner/types.js";
import type { TaskHandlerInput } from "../task-runner/TaskRunnerProvider.interface.js";
import type { Task } from "../task-runner/types.js";
import { taskFromInput, taskFromHandlerInput, taskFromStored } from "./taskMapping.js";

// Both mappers project an internal task shape onto the public `TranslationTask`. The two fragile
// properties are the full field set (incl. `strategy`) and the deliberate omission of
// `publishOnTranslation` (an internal write concern). `toEqual` (exact match) locks both in — a
// leaked field or a dropped `strategy` fails here rather than slipping through `objectContaining`.

describe("taskFromInput", () => {
  it("maps every public field and omits publishOnTranslation", () => {
    const input: TaskInput = {
      collectionSlug: "posts",
      collectionId: "doc-1",
      sourceLng: "en",
      targetLng: "de",
      strategy: "skip_existing",
      publishOnTranslation: true,
    };
    expect(taskFromInput(input)).toEqual({
      collection: "posts",
      id: "doc-1",
      sourceLng: "en",
      targetLng: "de",
      strategy: "skip_existing",
    });
  });
});

describe("taskFromHandlerInput", () => {
  it("maps every public field and omits publishOnTranslation", () => {
    const input: TaskHandlerInput = {
      collection: "pages",
      collectionId: "doc-2",
      sourceLng: "en",
      targetLng: "fr",
      strategy: "overwrite",
      publishOnTranslation: false,
    };
    expect(taskFromHandlerInput(input)).toEqual({
      collection: "pages",
      id: "doc-2",
      sourceLng: "en",
      targetLng: "fr",
      strategy: "overwrite",
    });
  });

  it("carries the handle when the execution knows one", () => {
    const input: TaskHandlerInput = {
      collection: "pages",
      collectionId: "doc-2",
      sourceLng: "en",
      targetLng: "fr",
      strategy: "overwrite",
      publishOnTranslation: false,
      handle: "run-9",
    };
    expect(taskFromHandlerInput(input)).toEqual({
      collection: "pages",
      id: "doc-2",
      sourceLng: "en",
      targetLng: "fr",
      strategy: "overwrite",
      handle: "run-9",
    });
  });
});

describe("taskFromStored", () => {
  it("maps every public field, names the run as the handle, and omits publishOnTranslation", () => {
    const stored: Task = {
      id: "run-9",
      status: "pending",
      input: {
        collectionSlug: "posts",
        collectionId: "doc-3",
        sourceLng: "en",
        targetLng: "es",
        strategy: "skip_existing",
        publishOnTranslation: true,
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      cancelled: false,
    };
    expect(taskFromStored(stored)).toEqual({
      collection: "posts",
      id: "doc-3",
      sourceLng: "en",
      targetLng: "es",
      strategy: "skip_existing",
      handle: "run-9",
    });
  });
});
