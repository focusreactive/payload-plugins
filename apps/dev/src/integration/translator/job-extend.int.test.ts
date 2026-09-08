import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload, CRON_BATCH_LIMIT } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

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

describe("a second request extends the live job rather than replacing it", () => {
  it("adds its locales to a job that has not started", async () => {
    const id = await createDoc();
    await enqueue(id, ["de", "fr"]);
    await enqueue(id, ["es"]);

    const live = await jobs(id);
    expect(live.length, "the second request queued a job of its own").toBe(1);
    expect(live[0].input?.target_lngs, "the locales already owed were dropped").toEqual([
      "de",
      "fr",
      "es",
    ]);
  });

  it("translates every locale the extended job accumulated", async () => {
    const id = await createDoc();
    await enqueue(id, ["de", "fr"]);
    await enqueue(id, ["es"]);

    await ctx.payload.jobs.run({ queue: "translations", limit: CRON_BATCH_LIMIT });

    for (const locale of ["de", "fr", "es"]) {
      const doc = (await ctx.payload.findByID({
        collection: "docs" as "pages",
        id,
        locale: locale as "en",
        fallbackLocale: false,
        draft: true,
      })) as Record<string, unknown>;
      expect(doc.title, `${locale} was not translated`).toBe("crS");
    }
  });

  it("keeps a locale the live job already owes from being listed twice", async () => {
    const id = await createDoc();
    await enqueue(id, ["de"]);
    await enqueue(id, ["de"]);

    const live = await jobs(id);
    expect(live.length).toBe(1);
    expect(live[0].input?.target_lngs, "the locale was queued a second time").toEqual(["de"]);
  });

  it("leaves a finished job alone and gives the new request its own", async () => {
    const id = await createDoc();
    await enqueue(id, ["de"]);
    const [first] = await jobs(id);
    await markFinished(first.id);

    await enqueue(id, ["fr"]);

    const after = await jobs(id);
    expect(after.filter((j) => j.completedAt).length, "the finished job was touched").toBe(1);
    expect(after.length, "finished job plus the new one").toBe(2);
  });
});
