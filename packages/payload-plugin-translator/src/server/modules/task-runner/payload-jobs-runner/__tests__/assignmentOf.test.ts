import { describe, expect, it } from "vitest";

import { assignmentOf } from "../store/assignmentOf.js";
import type { PayloadJob } from "../store/types.js";

const job = (input: PayloadJob["input"]): PayloadJob => ({
  id: "job-1",
  createdAt: "2026-10-24T00:00:00.000Z",
  updatedAt: "2026-10-24T00:00:00.000Z",
  input,
});

const described = {
  collection_slug: "posts",
  collection_id: "doc-1",
  source_lng: "en",
};

describe("one locale of a stored run, as the host is told about it", () => {
  it("describes the document, the languages and the run", () => {
    expect(assignmentOf(job(described), "de")).toEqual({
      collectionSlug: "posts",
      collectionId: "doc-1",
      sourceLng: "en",
      targetLng: "de",
      handle: "job-1",
    });
  });

  it("yields nothing when the row names no source language", () => {
    expect(
      assignmentOf(job({ collection_slug: "posts", collection_id: "doc-1" }), "de")
    ).toBeUndefined();
  });

  it("yields nothing when the row names no document", () => {
    expect(
      assignmentOf(job({ source_lng: "en" }), "de"),
      "a guessed collection would reach the host as fact"
    ).toBeUndefined();
  });
});
