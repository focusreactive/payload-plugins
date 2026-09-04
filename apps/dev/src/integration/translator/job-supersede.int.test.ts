import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// Rows are counted, never identified by id: SQLite reuses the rowid of a deleted row (integer primary
// key, no AUTOINCREMENT), so a replacement job can arrive carrying the deleted job's id and an
// id-based assertion would pass for the wrong reason.

type Job = {
  id: string | number;
  completedAt?: string | null;
  input?: { target_lng?: string; collection_id?: string };
};

let ctx: TestPayload;

const enqueue = async (id: string, target = "de") => {
  const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: target,
      collection_slug: "docs",
      collection_id: [id],
      strategy: "overwrite",
      publish_on_translation: false,
    },
  });
  expect(res.status, "the enqueue endpoint rejected the request").toBe(200);
  return (res.data as { data: { queued: number } }).data.queued;
};

// The cases share one boot, so the table also holds every earlier case's jobs.
const jobs = async (documentId: string): Promise<Job[]> => {
  const { docs } = await ctx.payload.find({
    collection: "payload-jobs" as "pages",
    pagination: false,
    where: { taskSlug: { equals: "translate_document" } } as never,
  });
  return (docs as Job[]).filter((j) => j.input?.collection_id === documentId);
};

const markFinished = (jobId: string | number) =>
  ctx.payload.update({
    collection: "payload-jobs" as "pages",
    id: jobId,
    data: { completedAt: new Date().toISOString(), processing: false } as never,
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

describe("re-enqueue supersedes unfinished work, not finished work", () => {
  it("keeps a finished job when the same locale is translated again", async () => {
    const id = await createDoc();
    expect(await enqueue(id), "fixture: the first enqueue queued a job").toBe(1);

    const [first] = await jobs(id);
    await markFinished(first.id);

    expect(await enqueue(id), "the re-enqueue queued nothing").toBe(1);

    const after = await jobs(id);
    expect(after.filter((j) => j.completedAt).length, "the finished job was deleted").toBe(1);
    expect(after.length, "finished job plus the new one").toBe(2);
  });

  it("still supersedes an unfinished job for the same locale", async () => {
    const id = await createDoc();
    await enqueue(id);
    expect((await jobs(id)).length, "fixture").toBe(1);

    expect(await enqueue(id), "the re-enqueue queued nothing").toBe(1);

    expect((await jobs(id)).length, "the unfinished job was not superseded").toBe(1);
  });

  it("leaves another locale's unfinished job alone", async () => {
    const id = await createDoc();
    await enqueue(id, "de");
    await enqueue(id, "fr");
    expect((await jobs(id)).length, "fixture: one job per locale").toBe(2);

    expect(await enqueue(id, "de"), "the re-enqueue queued nothing").toBe(1);

    const after = await jobs(id);
    expect(after.length, "the fr job was collateral damage").toBe(2);
    expect(after.map((j) => j.input?.target_lng).sort(), "one job per locale, still").toEqual([
      "de",
      "fr",
    ]);
  });
});
