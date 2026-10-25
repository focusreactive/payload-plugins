import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload, CRON_BATCH_LIMIT } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

let ctx: TestPayload;

const tr = (locale: string, text: string) => `${locale}:${text}`;

beforeAll(async () => {
  ctx = await bootTestPayload({ runner: createPayloadJobsRunner({ autoRun: false }) });
});

afterAll(async () => {
  await ctx?.cleanup();
});

const create = async (data: Record<string, unknown>) => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", ...data },
  });
  return String(made.id);
};

const enqueue = (body: Record<string, unknown>) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: "de",
      collection_slug: "docs",
      collection_id: [body.id],
      publish_on_translation: true,
      ...body,
    },
  });

const leaves = (...addresses: string[]) => [{ kind: "leaves", addresses }];

const work = () => ctx.payload.jobs.run({ queue: "translations", limit: CRON_BATCH_LIMIT });

const lastJobError = async () => {
  const { docs } = await ctx.payload.find({
    collection: "payload-jobs",
    sort: "-createdAt",
    limit: 1,
  });
  return JSON.stringify(docs[0]?.log ?? []);
};

const german = async (id: string) =>
  (await ctx.payload.findByID({ collection: "docs", id, locale: "de" })) as Record<string, unknown>;

describe("a run carries the fields it was asked for, through the stored job row", () => {
  it("translates the named leaves and leaves every sibling untouched", async () => {
    const id = await create({ title: "Pick me", note: "Leave me" });

    await enqueue({ id, filters: leaves("title") });
    await work();

    const de = await german(id);
    expect(de.title).toBe(tr("de", "Pick me"));
    expect(
      de.note,
      "untranslated: an empty target leaf is filled from the source on assembly"
    ).toBe("Leave me");
  });

  it("translates everything when the request carries no filters", async () => {
    const id = await create({ title: "All of it", note: "This too" });

    await enqueue({ id, filters: [] });
    await work();

    const de = await german(id);
    expect(de.title).toBe(tr("de", "All of it"));
    expect(de.note).toBe(tr("de", "This too"));
  });

  it("keeps one locale's leaf list out of a second request for another locale", async () => {
    const id = await create({ title: "Shared run", note: "Only in French" });

    await enqueue({ id, target_lng: "de", filters: leaves("title") });
    await enqueue({ id, target_lng: "fr" });
    await work();

    const de = await german(id);
    const fr = (await ctx.payload.findByID({ collection: "docs", id, locale: "fr" })) as Record<
      string,
      unknown
    >;

    expect(de.note, "German asked for the title only, so this was never sent").toBe(
      "Only in French"
    );
    expect(fr.note, "French asked for everything").toBe(tr("fr", "Only in French"));
  });

  it("gives a later request for the same locale its own fields", async () => {
    const id = await create({ title: "Both asked", note: "Second asked for this" });

    await enqueue({ id, filters: leaves("title") });
    await work();
    await enqueue({ id, filters: leaves("note") });
    await work();

    const de = await german(id);
    expect(de.title, "the first request's leaf").toBe(tr("de", "Both asked"));
    expect(de.note, "and the later request's, which the first run did not cover").toBe(
      tr("de", "Second asked for this")
    );
  });

  it("applies one leaf list to every document it was sent with", async () => {
    const first = await create({ title: "One", note: "Not this" });
    const second = await create({ title: "Two", note: "Nor this" });

    await enqueue({ id: first, collection_id: [first, second], filters: leaves("title") });
    await work();

    for (const [id, title] of [
      [first, "One"],
      [second, "Two"],
    ] as const) {
      const de = await german(id);
      expect(de.title).toBe(tr("de", title));
      expect(de.note, "the same list narrowed both documents").not.toContain("de:");
    }
  });

  it("fails the run rather than translate everything when nothing answers the rule", async () => {
    const id = await create({ title: "Unknown rule" });

    const response = await enqueue({ id, filters: [{ kind: "rule", name: "nobody-answers" }] });
    expect(
      response.status,
      "the route queues the name; what answers to it is the run's question"
    ).toBe(200);
    await work();

    const de = await german(id);
    expect(de.title, "the whole document was not translated instead").toBeUndefined();
    expect(await lastJobError(), "the run failed rather than quietly covering nothing").toContain(
      "No criterion answers"
    );
  });
});
