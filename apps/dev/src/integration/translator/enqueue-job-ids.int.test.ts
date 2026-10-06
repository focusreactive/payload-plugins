import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type QueuedJob = {
  collection_slug: string;
  collection_id: string;
  target_lng: string;
  job_id: string;
};

let ctx: TestPayload;

const enqueue = (collectionId: string[], targetLng: string | string[]) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: targetLng,
      collection_slug: "docs",
      collection_id: collectionId,
      strategy: "overwrite",
      publish_on_translation: true,
    },
  });

const bodyOf = (res: { data: unknown }) =>
  (res.data as { data: { queued: number; jobs?: QueuedJob[] } }).data;

const jobsOf = (res: { data: unknown }) => bodyOf(res).jobs ?? [];

const create = async (title: string): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", title, note: "A note" },
  });
  return String(made.id);
};

describe("the enqueue response names the job that will run each locale", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload();
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("answers one entry per target locale", async () => {
    const id = await create("Three locales");

    const jobs = jobsOf(await enqueue([id], ["de", "fr", "es"]));

    expect(jobs.map((job) => job.target_lng).sort()).toEqual(["de", "es", "fr"]);
    expect(jobs.every((job) => job.job_id.length > 0)).toBe(true);
  });

  it("names the document each entry belongs to, so a bulk request stays unambiguous", async () => {
    const first = await create("First");
    const second = await create("Second");

    const jobs = jobsOf(await enqueue([first, second], "de"));

    expect(
      jobs.map((job) => job.collection_id).sort(),
      "a locale-keyed answer could not tell these two apart"
    ).toEqual([first, second].sort());
    expect(jobs.every((job) => job.collection_slug === "docs")).toBe(true);
  });

  it("still reports how many it queued", async () => {
    const id = await create("Counted");

    const res = await enqueue([id], ["de", "fr"]);

    expect(bodyOf(res).queued, "the count that was already there must survive").toBe(2);
    expect(jobsOf(res)).toHaveLength(2);
  });
});
