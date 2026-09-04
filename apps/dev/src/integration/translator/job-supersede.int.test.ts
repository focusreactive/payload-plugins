import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// What a re-enqueue supersedes. Booted with the real job runner and autorun off, so jobs are written
// to `payload-jobs` and left there — the rows are the subject, not the translations.
//
// Rows are counted, never identified by id: SQLite reuses the rowid of a deleted row (integer primary
// key, no AUTOINCREMENT), so a replacement job can arrive carrying the deleted job's id and an
// id-based assertion would pass for the wrong reason.

type Job = {
  id: string | number;
  completedAt?: string | null;
  processing?: boolean;
  input?: { collection_id?: string; target_lngs?: string[] };
};

let ctx: TestPayload;

const enqueue = async (id: string, targets: string[] = ["de"]) => {
  const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: targets,
      collection_slug: "docs",
      collection_id: [id],
      strategy: "overwrite",
      publish_on_translation: false,
    },
  });
  expect(res.status, "the enqueue endpoint rejected the request").toBe(200);
  const body = res.data as { data: { queued: number } };
  return body.data.queued;
};

// One workflow per document, so these are workflow rows, not task rows. The cases share one boot, so
// the table also holds every earlier case's jobs.
const jobs = async (documentId: string): Promise<Job[]> => {
  const { docs } = await ctx.payload.find({
    collection: "payload-jobs" as "pages",
    pagination: false,
    where: { workflowSlug: { equals: "translate_document_locales" } } as never,
  });
  return (docs as Job[]).filter((j) => j.input?.collection_id === documentId);
};

const markFinished = (jobId: string | number) =>
  ctx.payload.update({
    collection: "payload-jobs" as "pages",
    id: jobId,
    data: { completedAt: new Date().toISOString(), processing: false } as never,
  });

const markRunning = (jobId: string | number) =>
  ctx.payload.update({
    collection: "payload-jobs" as "pages",
    id: jobId,
    data: { processing: true } as never,
  });

const createDoc = async () => {
  const doc = await ctx.payload.create({
    collection: "docs" as "pages",
    locale: "en",
    data: { title: "Src", _status: "published" } as never,
  });
  return String(doc.id);
};

beforeAll(async () => {
  ctx = await bootTestPayload({ runner: createPayloadJobsRunner({ autoRun: false }) });
});
afterAll(async () => {
  await ctx?.cleanup();
});

describe("re-enqueue supersedes work that has not begun, and nothing else", () => {
  it("keeps a finished job when the document is translated again", async () => {
    const id = await createDoc();
    expect(await enqueue(id), "fixture: the first enqueue queued a workflow").toBe(1);

    const [first] = await jobs(id);
    await markFinished(first.id);

    expect(await enqueue(id), "the re-enqueue queued nothing").toBe(1);

    const after = await jobs(id);
    expect(after.filter((j) => j.completedAt).length, "the finished job was deleted").toBe(1);
    expect(after.length, "finished job plus the new one").toBe(2);
  });

  it("supersedes a job that has not started", async () => {
    const id = await createDoc();
    await enqueue(id);
    expect((await jobs(id)).length, "fixture").toBe(1);

    expect(await enqueue(id), "the re-enqueue queued nothing").toBe(1);

    expect((await jobs(id)).length, "the pending job was not superseded").toBe(1);
  });

  it("leaves a job that is already running alone", async () => {
    // The reason supersession is narrowed to not-yet-started work: a running workflow holds locales
    // it has already translated, and cancelling it would throw them away.
    const id = await createDoc();
    await enqueue(id);
    const [running] = await jobs(id);
    await markRunning(running.id);

    expect(await enqueue(id), "the re-enqueue queued nothing").toBe(1);

    expect((await jobs(id)).length, "the running job was cancelled").toBe(2);
  });
});
