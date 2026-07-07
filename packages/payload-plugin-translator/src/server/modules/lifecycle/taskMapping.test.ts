import { describe, it, expect } from "vitest";
import type { TaskInput } from "../task-runner/types";
import type { TaskHandlerInput } from "../task-runner/TaskRunnerProvider.interface";
import { taskFromInput, taskFromHandlerInput } from "./taskMapping";

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
});
