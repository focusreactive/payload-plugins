import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

/*
 * The upgrade path, end to end: a row written before 1.0 names `target_lngs` and a `strategy`, and
 * carries no `targets`. Appending a locale to such a row writes `targets` beside the fields that
 * were already there, so the row then carries both shapes — a state only this path produces.
 */

type LegacyInput = {
  collection_slug?: string;
  collection_id?: string;
  source_lng?: string;
  target_lngs?: string[];
  strategy?: string;
  targets?: { lng: string; filters?: unknown[] }[];
};
type Job = { id: string | number; input?: LegacyInput };

let ctx: TestPayload;

const createDoc = async () => {
  const doc = await ctx.payload.create({
    collection: "docs" as "pages",
    locale: "en",
    data: { title: "Src", _status: "published" } as never,
  });
  return String(doc.id);
};

const enqueue = (id: string, locales: string[]) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: locales,
      collection_slug: "docs",
      collection_id: [id],
      publish_on_translation: false,
    },
  });

const jobFor = async (documentId: string): Promise<Job> => {
  const { docs } = await ctx.payload.find({
    collection: "payload-jobs" as "pages",
    pagination: false,
    where: { workflowSlug: { equals: "translate_document_locales" } } as never,
  });
  const found = (docs as Job[]).find((job) => job.input?.collection_id === documentId);
  if (!found) throw new Error("no job row for that document");
  return found;
};

/** Rewrites a live row into the shape a pre-1.0 release wrote. */
const ageTheRow = async (job: Job) => {
  const { targets: _dropped, ...rest } = job.input ?? {};
  await ctx.payload.update({
    collection: "payload-jobs" as "pages",
    id: job.id,
    data: {
      input: { ...rest, target_lngs: ["de"], strategy: "skip_existing" },
    } as never,
  });
};

beforeAll(async () => {
  ctx = await bootTestPayload({ runner: createPayloadJobsRunner({ autoRun: false }) });
});
afterAll(async () => {
  await ctx?.cleanup();
});

describe("a run row written before 1.0", () => {
  it("takes an appended locale without losing the one it already named", async () => {
    const id = await createDoc();
    expect((await enqueue(id, ["de"])).status).toBe(200);
    await ageTheRow(await jobFor(id));

    expect((await enqueue(id, ["fr"])).status).toBe(200);

    const input = (await jobFor(id)).input ?? {};
    expect(input.targets?.map((target) => target.lng)).toEqual(["de", "fr"]);
  });

  it("carries its strategy over as the drift rule, and narrows the appended locale by nothing", async () => {
    const id = await createDoc();
    expect((await enqueue(id, ["de"])).status).toBe(200);
    await ageTheRow(await jobFor(id));
    expect((await enqueue(id, ["fr"])).status).toBe(200);

    const targets = (await jobFor(id)).input?.targets ?? [];

    expect(targets[0]).toMatchObject({ lng: "de", filters: [{ kind: "rule", name: "stale" }] });
    expect(targets[1]).toMatchObject({ lng: "fr", filters: [] });
  });

  it("still answers the document-status route for the locales it names", async () => {
    const id = await createDoc();
    expect((await enqueue(id, ["de"])).status).toBe(200);
    await ageTheRow(await jobFor(id));

    const res = await callEndpoint(
      ctx.payload,
      "get",
      "/translate/document/:collection_slug/:collection_id",
      {
        routeParams: { collection_slug: "docs", collection_id: id },
      }
    );

    expect(res.status).toBe(200);
    const rows = (res.data as { data: { input: { target_lng: string } }[] }).data;
    expect(rows.map((row) => row.input.target_lng)).toEqual(["de"]);
  });
});
