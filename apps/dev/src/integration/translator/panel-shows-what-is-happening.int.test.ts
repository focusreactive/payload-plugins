import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

let ctx: TestPayload;

const RUNS = "translator-runs" as "docs";
const WINDOW_DAYS = 3;
const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

type Entry = { id: string; status: string; collection_id: string; target_lng: string };

const create = async (title: string): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", title, note: "A note" },
  });
  return String(made.id);
};

const enqueue = async (ids: string[], locales: string[]): Promise<void> => {
  await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: locales,
      collection_slug: "docs",
      collection_id: ids,

      publish_on_translation: false,
    },
  });
};

const panel = async (): Promise<{ docs: Entry[]; failed_window_ms: number }> => {
  const res = await callEndpoint(ctx.payload, "get", "/translate/collection/:collection_slug", {
    routeParams: { collection_slug: "docs" },
  });
  return (res.data as { data: { docs: Entry[]; failed_window_ms: number } }).data;
};

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

/**
 * A locale the runner has picked up and not answered for. The record is told a locale failed only
 * once the run gives up, so between attempts there is a start and no settlement.
 */
const seedRunBetweenAttempts = (id: string, targetLng: string, lastAttemptAt: string) =>
  seedRun(id, targetLng, { startedAt: lastAttemptAt });

/** Seeded rather than translated, so a case can place a failure days in the past. */
const seedRun = async (
  documentId: string,
  targetLng: string,
  progress: {
    startedAt?: string;
    settledAt?: string;
    outcome?: "delivered" | "failed" | "cancelled";
    error?: string;
  }
): Promise<void> => {
  await ctx.payload.create({
    collection: RUNS,
    data: {
      handle: `seeded-${documentId}-${targetLng}`,
      collectionSlug: "docs",
      collectionId: documentId,
      sourceLng: "en",
      targetLng,
      publishOnTranslation: false,
      queuedAt: progress.startedAt ?? new Date().toISOString(),
      ...progress,
    },
  } as never);
};

const localesIn = (entries: Entry[]): string[] => entries.map((entry) => entry.target_lng).sort();

describe("the collection panel reports what is happening", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({ autoRun: false }),
      failedWindowMs: WINDOW_MS,
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("names a run that is queued", async () => {
    const id = await create("Queued");
    await enqueue([id], ["de"]);

    expect(localesIn((await panel()).docs)).toContain("de");
  });

  it("says nothing about a run that completed", async () => {
    const id = await create("Completed");
    await seedRun(id, "it", {
      startedAt: daysAgo(0),
      settledAt: new Date().toISOString(),
      outcome: "delivered",
    });

    const entries = (await panel()).docs.filter((entry) => entry.collection_id === id);
    expect(
      entries,
      "a collection-wide total of finished work can never be both bounded and true"
    ).toEqual([]);
  });

  it("names a run that failed inside the window", async () => {
    const id = await create("Failed recently");
    await seedRun(id, "es", {
      startedAt: daysAgo(1),
      settledAt: daysAgo(1),
      outcome: "failed",
      error: "it broke",
    });

    const entries = (await panel()).docs.filter((entry) => entry.collection_id === id);
    expect(localesIn(entries), "a recent failure is a call to action").toEqual(["es"]);
    expect(
      entries.map((entry) => entry.status),
      "a run the queue gave up on is the one thing this row exists to report"
    ).toEqual(["failed"]);
  });

  it("says nothing about a run that failed before the window", async () => {
    const id = await create("Failed long ago");
    await seedRun(id, "pt", {
      startedAt: daysAgo(WINDOW_DAYS + 1),
      settledAt: daysAgo(WINDOW_DAYS + 1),
      outcome: "failed",
      error: "it broke",
    });

    const entries = (await panel()).docs.filter((entry) => entry.collection_id === id);
    expect(entries, "a failure from months ago is not an action").toEqual([]);
  });

  it("treats a run that is still retrying as in flight, not as failed", async () => {
    const id = await create("Retrying");
    await seedRunBetweenAttempts(id, "nl", daysAgo(WINDOW_DAYS + 1));

    const entries = (await panel()).docs.filter((entry) => entry.collection_id === id);
    expect(
      localesIn(entries),
      "a run between attempts is still work in flight, however old its last attempt"
    ).toEqual(["nl"]);
    expect(
      entries.map((entry) => entry.status),
      "telling someone to open a document over a run that is still retrying is a false alarm"
    ).toEqual(["running"]);
  });

  it("reports the window it counted failures over", async () => {
    expect((await panel()).failed_window_ms).toBe(WINDOW_MS);
  });
});
