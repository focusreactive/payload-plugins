import { describe, expect, it } from "vitest";

import type { ListTranslationState } from "../../../../../types/wire/ListTranslationState.js";
import { batchOf, batchSummary, collectionEnqueue, liveDocumentsOf } from "../collectionBatch.js";

const AT = "2026-11-01T09:00:00.000Z";
const run = { handle: "h", locales: ["de"], queuedAt: AT };
const empty = { kind: "empty" } as const;

const LIST: ListTranslationState = {
  collection: "pages",
  docs: [
    { id: "1", locales: [{ locale: "de", content: empty, run: null }] },
    { id: "2", locales: [{ locale: "de", content: empty, run: { status: "queued", ...run } }] },
    { id: "3", locales: [{ locale: "de", content: empty, run: { status: "running", ...run } }] },
    {
      id: "4",
      locales: [{ locale: "de", content: empty, run: { status: "failed", message: "x", ...run } }],
    },
  ],
};

describe("the documents with a live run", () => {
  it("are those with a queued or running run on any locale", () => {
    expect([...liveDocumentsOf(LIST)].sort()).toEqual(["2", "3"]);
  });

  it("are none while the list state is unknown", () => {
    expect(liveDocumentsOf(undefined).size).toBe(0);
  });
});

describe("editing the selection", () => {
  const live = new Set(["2"]);

  it("queues the selected documents in order and skips those with a live run", () => {
    expect(batchOf(["1", "2", "4"], new Set(), live)).toEqual({
      queue: ["1", "4"],
      skipped: ["2"],
    });
  });

  it("leaves out a removed document entirely", () => {
    expect(batchOf(["1", "2", "4"], new Set(["1", "2"]), live)).toEqual({
      queue: ["4"],
      skipped: [],
    });
  });

  it("queues nothing when every document is removed", () => {
    expect(batchOf(["1"], new Set(["1"]), live)).toEqual({ queue: [], skipped: [] });
  });
});

describe("the queued-count line", () => {
  it("multiplies documents by locales", () => {
    expect(batchSummary(2, 3)).toBe("6 translations will be queued — 2 documents into 3 locales.");
  });

  it("speaks in the singular for one of each", () => {
    expect(batchSummary(1, 1)).toBe("1 translation will be queued — 1 document into 1 locale.");
  });

  it("says nothing is queued when either side is empty", () => {
    expect(batchSummary(0, 3)).toBe("Nothing will be queued — choose a document and a locale.");
    expect(batchSummary(2, 0)).toBe("Nothing will be queued — choose a document and a locale.");
  });
});

describe("the collection's enqueue body", () => {
  const base = { collection: "pages", source: "en", targets: ["de", "fr"], documents: ["1", "4"] };

  it("translates the documents whole into the chosen locales, without publishing", () => {
    expect(collectionEnqueue({ ...base, onlyBehind: false })).toEqual({
      source_lng: "en",
      target_lng: ["de", "fr"],
      collection_slug: "pages",
      collection_id: ["1", "4"],
    });
  });

  it("asks for only what is behind with the stale rule", () => {
    expect(collectionEnqueue({ ...base, onlyBehind: true })).toEqual({
      source_lng: "en",
      target_lng: ["de", "fr"],
      collection_slug: "pages",
      collection_id: ["1", "4"],
      filters: [{ kind: "rule", name: "stale" }],
    });
  });

  it("is nothing without a document or a locale", () => {
    expect(collectionEnqueue({ ...base, documents: [], onlyBehind: false })).toBeNull();
    expect(collectionEnqueue({ ...base, targets: [], onlyBehind: false })).toBeNull();
  });
});
