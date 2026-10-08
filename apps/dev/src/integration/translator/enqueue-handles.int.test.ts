import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

let ctx: TestPayload;

type Assignment = {
  collection_slug: string;
  collection_id: string;
  target_lng: string;
  handle: string;
};

const create = async (title: string): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", title, note: "A note" },
  });
  return String(made.id);
};

const enqueue = async (ids: string[], locales: string[]): Promise<Assignment[]> => {
  const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: locales,
      collection_slug: "docs",
      collection_id: ids,
      strategy: "overwrite",
      publish_on_translation: false,
    },
  });
  return (res.data as { data: { assignments?: Assignment[] } }).data.assignments ?? [];
};

describe("the enqueue answer names the run that will translate each locale", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({ runner: createPayloadJobsRunner({ autoRun: false }) });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("answers once per requested locale, naming a run that really exists", async () => {
    const id = await create("One document");

    const assignments = await enqueue([id], ["de", "fr"]);

    expect(assignments.map((j) => j.target_lng).sort()).toEqual(["de", "fr"]);
    const rows = await ctx.payload.find({
      collection: "payload-jobs" as "docs",
      pagination: false,
      where: { id: { in: assignments.map((j) => j.handle) } } as never,
    });
    expect(rows.docs, "every handle answered names a row that is actually there").toHaveLength(
      new Set(assignments.map((j) => j.handle)).size
    );
  });

  it("gives two locales of one document the same run", async () => {
    const id = await create("Shared run");

    const assignments = await enqueue([id], ["de", "fr"]);

    expect(
      new Set(assignments.map((j) => j.handle)),
      "one run covers a document's locale list"
    ).toHaveLength(1);
  });

  it("keeps two documents apart", async () => {
    const first = await create("First");
    const second = await create("Second");

    const assignments = await enqueue([first, second], ["de", "fr"]);

    expect(assignments, "two documents, two locales each").toHaveLength(4);
    expect(new Set(assignments.map((j) => j.handle))).toHaveLength(2);
    expect(
      new Set(assignments.filter((j) => j.collection_id === first).map((j) => j.handle))
    ).toHaveLength(1);
  });

  it("still names the run for a locale a live run already covers", async () => {
    const id = await create("Asked twice");

    const first = await enqueue([id], ["de"]);
    const second = await enqueue([id], ["de", "fr"]);

    expect(
      second.map((j) => j.target_lng).sort(),
      "de needed no write, but it is being translated — leaving it out would report nothing for it"
    ).toEqual(["de", "fr"]);
    expect(
      second.find((j) => j.target_lng === "de")?.handle,
      "and it is the run that already had it"
    ).toBe(first[0]?.handle);
  });
});
