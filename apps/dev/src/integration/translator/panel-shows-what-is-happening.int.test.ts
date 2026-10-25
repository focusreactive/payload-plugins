import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

let ctx: TestPayload;

const JOBS = "payload-jobs" as "docs";
const WORKFLOW = "translate_document_locales";
const QUEUE = "translations";
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

const ERROR = { name: "Error", message: "boom", cancelled: false, stack: "" };

/**
 * `gave-up` and `retrying` are the only two failure shapes Payload writes: `handleWorkflowError.js`
 * stores `error` on every attempt and sets `hasError` only once it stops retrying.
 */
const failureShape = (failure: "gave-up" | "retrying"): Record<string, unknown> => {
  if (failure === "gave-up") return { error: ERROR, hasError: true };
  return { error: ERROR };
};

/** `payload.update` rewrites `updatedAt` with now, so a backdated run goes through `payload.db.updateOne`. */
const seedRun = async (
  documentId: string,
  targetLng: string,
  state: {
    failure?: "gave-up" | "retrying";
    completedAt?: string;
    updatedAt?: string;
    log?: Array<Record<string, unknown>>;
  }
): Promise<void> => {
  const row = await ctx.payload.create({
    collection: JOBS,
    data: {
      workflowSlug: WORKFLOW,
      queue: QUEUE,
      input: {
        collection_slug: "docs",
        collection_id: documentId,
        source_lng: "en",
        targets: [{ lng: targetLng }],
      },
      ...(state.failure === undefined ? {} : failureShape(state.failure)),
      ...(state.completedAt === undefined ? {} : { completedAt: state.completedAt }),
      ...(state.log === undefined ? {} : { log: state.log }),
    },
  } as never);

  if (state.updatedAt === undefined) return;
  await ctx.payload.db.updateOne({
    collection: JOBS,
    id: (row as { id: unknown }).id,
    data: { updatedAt: state.updatedAt },
    returning: false,
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
    await seedRun(id, "it", { completedAt: new Date().toISOString() });

    const entries = (await panel()).docs.filter((entry) => entry.collection_id === id);
    expect(
      entries,
      "a collection-wide total of finished work can never be both bounded and true"
    ).toEqual([]);
  });

  it("names a run that failed inside the window", async () => {
    const id = await create("Failed recently");
    await seedRun(id, "es", { failure: "gave-up", updatedAt: daysAgo(1) });

    const entries = (await panel()).docs.filter((entry) => entry.collection_id === id);
    expect(localesIn(entries), "a recent failure is a call to action").toEqual(["es"]);
    expect(
      entries.map((entry) => entry.status),
      "a run the queue gave up on is the one thing this row exists to report"
    ).toEqual(["failed"]);
  });

  it("says nothing about a run that failed before the window", async () => {
    const id = await create("Failed long ago");
    await seedRun(id, "pt", { failure: "gave-up", updatedAt: daysAgo(WINDOW_DAYS + 1) });

    const entries = (await panel()).docs.filter((entry) => entry.collection_id === id);
    expect(entries, "a failure from months ago is not an action").toEqual([]);
  });

  it("treats a run that is still retrying as in flight, not as failed", async () => {
    const id = await create("Retrying");
    await seedRun(id, "nl", {
      failure: "retrying",
      updatedAt: daysAgo(WINDOW_DAYS + 1),
      log: [
        {
          taskSlug: "translate_document",
          taskID: "nl",
          state: "failed",
          executedAt: daysAgo(WINDOW_DAYS + 1),
          completedAt: daysAgo(WINDOW_DAYS + 1),
          error: { message: "boom" },
          input: { target_lng: "nl" },
        },
      ],
    });

    const entries = (await panel()).docs.filter((entry) => entry.collection_id === id);
    expect(
      localesIn(entries),
      "hasError is set only on final give-up, so a retrying run is still work in flight"
    ).toEqual(["nl"]);
    expect(
      entries.map((entry) => entry.status),
      "telling someone to open a document over a run that is still retrying is a false alarm"
    ).toEqual(["pending"]);
  });

  it("reports the window it counted failures over", async () => {
    expect((await panel()).failed_window_ms).toBe(WINDOW_MS);
  });
});
