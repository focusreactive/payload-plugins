import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";
import { buildTestCollections } from "./testCollections";

let ctx: TestPayload;
let editor: { id: string; collection: string };

// `title` refuses every field write; `tagline` has no rule. The deferred path must reach the same
// answer the inline one does — but it gets there differently, by rebuilding the requester from the
// stored row long after the request that queued it is gone.
const withFieldRule = (collections: CollectionConfig[]): CollectionConfig[] =>
  collections.map((c) => {
    if (c.slug !== "docs") return c;
    return {
      ...c,
      fields: [
        ...c.fields.map((f) =>
          "name" in f && f.name === "title" ? { ...f, access: { update: () => false } } : f
        ),
        { name: "tagline", type: "text", localized: true },
      ],
    } as CollectionConfig;
  });

const jobsFor = async (documentId: string) => {
  const { docs } = await ctx.payload.find({
    collection: "payload-jobs" as "pages",
    pagination: false,
    where: { workflowSlug: { equals: "translate_document_locales" } } as never,
  });
  return (docs as Array<{ input?: Record<string, unknown> }>).filter(
    (j) => j.input?.collection_id === documentId
  );
};

const enqueueAs = async (id: string, user: { id: string; collection: string } | null) => {
  const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    user,
    body: {
      source_lng: "en",
      target_lng: ["de"],
      collection_slug: "docs",
      collection_id: [id],
      strategy: "overwrite",
      publish_on_translation: false,
    },
  });
  expect(res.status).toBe(200);
};

const seed = async (title: string, tagline: string) => {
  const created = await ctx.payload.create({
    collection: "docs" as "pages",
    locale: "en",
    data: { title, tagline } as never,
  });
  const id = String(created.id);
  await ctx.payload.update({
    collection: "docs" as "pages",
    id,
    locale: "de",
    data: { title: "Eigener Titel", tagline: "Eigene Zeile" } as never,
    draft: true,
  });
  return id;
};

const germanDoc = async (id: string) =>
  (await ctx.payload.findByID({
    collection: "docs" as "pages",
    id,
    locale: "de",
    draft: true,
  })) as { title?: string; tagline?: string };

describe("a queued translation is decided by whoever asked for it", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: withFieldRule(buildTestCollections()),
      runner: createPayloadJobsRunner({ autoRun: false }),
    });
    const user = await ctx.payload.create({
      collection: "users" as "pages",
      data: { email: "editor@test.dev", password: "pw123456" } as never,
    });
    editor = { id: String((user as { id: string | number }).id), collection: "users" };
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("records the requester on the job row", async () => {
    const id = await seed("Queued", "Queued line");

    await enqueueAs(id, editor);

    const [job] = await jobsFor(id);
    expect(String(job?.input?.requester_id)).toBe(editor.id);
    expect(job?.input?.requester_collection).toBe("users");
  });

  // The request that queued this is long gone by the time it runs, so rebuilding from the row is the
  // only thing that can make the field rule apply. Without it, `title` would be overwritten.
  it("writes as them — the field rule still applies when the job runs", async () => {
    const id = await seed("Deferred", "Deferred line");

    await enqueueAs(id, editor);
    await ctx.payload.jobs.run({ queue: "translations", limit: 10 });

    const de = await germanDoc(id);
    expect(de.title, "the denied field must survive the deferred write").toBe("Eigener Titel");
    expect(de.tagline, "its sibling must still be translated").toBe("de:Deferred line");
  });

  // A row that names nobody keeps the old behaviour, so an upgrade does not strand queued work.
  it("pre-upgrade job — a row with no requester writes without a check", async () => {
    const id = await seed("Legacy", "Legacy line");

    await enqueueAs(id, null);
    await ctx.payload.jobs.run({ queue: "translations", limit: 10 });

    const de = await germanDoc(id);
    expect(de.title, "an unattributed write is not checked, so the rule does not apply").toBe(
      "de:Legacy"
    );
  });
});
