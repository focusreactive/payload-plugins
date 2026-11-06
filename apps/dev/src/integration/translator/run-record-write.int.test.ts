import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload, CRON_BATCH_LIMIT } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// The unit specs assert what the plugin asks the store to write; these assert that the columns take it.

const RUNS = "translator-runs";

type Row = {
  handle: string;
  targetLng: string;
  queuedAt: string | null;
  startedAt: string | null;
  settledAt: string | null;
  outcome: string | null;
  error: string | null;
  attempts: number | null;
  publishOnTranslation: boolean;
  filters: string | null;
};

const create = async (ctx: TestPayload, title: string): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", title, note: "A note" },
  });
  return String(made.id);
};

const enqueue = (ctx: TestPayload, id: string, locales: string[]) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: locales,
      collection_slug: "docs",
      collection_id: [id],
      publish_on_translation: false,
    },
  });

const rowsFor = async (ctx: TestPayload, id: string): Promise<Row[]> => {
  const found = await ctx.payload.find({
    collection: RUNS,
    where: {
      and: [{ collectionSlug: { equals: "docs" } }, { collectionId: { equals: id } }],
    },
    limit: 100,
    pagination: false,
    sort: "targetLng",
  });
  return found.docs as unknown as Row[];
};

describe("what a translation writes into the run record", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload({ failFor: ["es"] });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("writes one row per locale and settles each one", async () => {
    const id = await create(ctx, "A document to translate");

    await enqueue(ctx, id, ["de", "fr"]);

    const rows = await rowsFor(ctx, id);
    expect(rows.map((row) => row.targetLng)).toEqual(["de", "fr"]);
    for (const row of rows) {
      expect(row.outcome, `${row.targetLng} settled`).toBe("delivered");
      expect(row.settledAt).not.toBeNull();
      expect(row.error).toBeNull();
    }
  });

  it("stamps when the locale was queued, when it started and what attempt it was on", async () => {
    const id = await create(ctx, "A document whose timings matter");

    await enqueue(ctx, id, ["de"]);

    const [row] = await rowsFor(ctx, id);
    expect(row.queuedAt).not.toBeNull();
    expect(row.startedAt, "the plugin's handler ran, so the row says so").not.toBeNull();
    expect(row.attempts).toBe(1);
    expect(Date.parse(row.startedAt as string)).toBeGreaterThanOrEqual(
      Date.parse(row.queuedAt as string)
    );
  });

  it("records the failure of a locale the provider refused, and only that locale", async () => {
    const id = await create(ctx, "A document one locale will refuse");

    await enqueue(ctx, id, ["de", "es"]);

    const rows = await rowsFor(ctx, id);
    const byLocale = new Map(rows.map((row) => [row.targetLng, row]));
    expect(byLocale.get("de")?.outcome).toBe("delivered");
    expect(byLocale.get("es")?.outcome).toBe("failed");
    expect(byLocale.get("es")?.error, "a failure says something").toBeTruthy();
  });

  it("names the run the same way the enqueue answer did", async () => {
    const id = await create(ctx, "A document whose handle must match");

    const answer = await enqueue(ctx, id, ["de"]);
    const assignments =
      (answer.data as { data: { assignments?: Array<{ handle: string; target_lng: string }> } })
        .data.assignments ?? [];

    const [row] = await rowsFor(ctx, id);
    expect(assignments.map((a) => a.handle)).toContain(row.handle);
  });
});
