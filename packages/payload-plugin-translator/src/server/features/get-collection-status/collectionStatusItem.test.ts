import { describe, expect, it } from "vitest";
import type { CollectionSlug } from "payload";

import { toCollectionStatusItem } from "./model.js";
import type { Task } from "../../modules/task-runner/index.js";

const task = (targetLng: string, collectionId: string): Task => ({
  id: "job-77",
  status: "pending",
  input: {
    collectionSlug: "posts" as CollectionSlug,
    collectionId,
    sourceLng: "en",
    targetLng,
    strategy: "overwrite",
    publishOnTranslation: false,
  },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  cancelled: false,
});

describe("a collection-status entry says which translation it is", () => {
  it("names the document and the target locale beside the job", () => {
    expect(toCollectionStatusItem(task("de", "doc-1"))).toEqual({
      id: "job-77",
      status: "pending",
      collection_id: "doc-1",
      target_lng: "de",
    });
  });

  it("tells two locales of one job apart, which the job id alone cannot", () => {
    const [de, fr] = [task("de", "doc-1"), task("fr", "doc-1")].map(toCollectionStatusItem);

    expect(de.id, "they really do share a job row").toBe(fr.id);
    expect([de.target_lng, fr.target_lng]).toEqual(["de", "fr"]);
  });
});
