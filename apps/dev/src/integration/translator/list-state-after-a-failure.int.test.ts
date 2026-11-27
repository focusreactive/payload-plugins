import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import type { CollectionConfig } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type Run = { status: string; locales: string[]; failedLocale?: string; message?: string } | null;
type Row = {
  id: string;
  locales: { locale: string; content: { kind: string; translatedAt?: string | null }; run: Run }[];
};
type ListState = { collection: string; docs: Row[] };

const ATTEMPTS = 2;
const PASSES_UNTIL_THE_RUN_GIVES_UP = ATTEMPTS + 1;

const docs: CollectionConfig = {
  slug: "docs",
  fields: [
    { name: "title", type: "text", localized: true },
    { name: "owner", type: "text" },
  ],
  access: { read: ({ req }) => (req.user ? { owner: { not_equals: "hidden" } } : true) },
};

const list = async (ctx: TestPayload, ids: string[], user?: { id: string; collection: string }) => {
  const res = await callEndpoint(ctx.payload, "get", "/translate/list-state/:collection_slug", {
    routeParams: { collection_slug: "docs" },
    query: `ids=${ids.join(",")}`,
    ...(user ? { user } : {}),
  });
  return { status: res.status, state: (res.data as { data: ListState }).data };
};

const localeOf = (row: Row | undefined, locale: string) =>
  row?.locales.find((one) => one.locale === locale);

describe("a run that broke part way through, as the list shows it", () => {
  let ctx: TestPayload;
  let id: string;

  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: [docs],
      runner: createPayloadJobsRunner({
        autoRun: false,
        retries: { attempts: ATTEMPTS, backoff: { type: "fixed", delay: 0 } },
      }),
      onTranslate: (targetLng) => {
        if (targetLng === "de") throw new Error("provider down");
      },
    });
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { title: "Broken", owner: "anyone" },
    });
    id = String(made.id);

    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de", "fr"],
        collection_slug: "docs",
        collection_id: [id],
      },
    });
    for (let pass = 0; pass < PASSES_UNTIL_THE_RUN_GIVES_UP; pass++) {
      await ctx.payload.jobs.run({ queue: "translations" });
    }
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("shows the locale that broke as failed, naming every locale the run covered", async () => {
    const { state } = await list(ctx, [id]);
    const german = localeOf(state.docs[0], "de")?.run;

    expect(german?.status).toBe("failed");
    expect(german?.locales).toStrictEqual(["de", "fr"]);
    expect(typeof german?.message).toBe("string");
  });

  it("shows the locale it never got to as not started, naming the one that failed", async () => {
    const { state } = await list(ctx, [id]);
    const french = localeOf(state.docs[0], "fr")?.run;

    expect(french?.status).toBe("not-started");
    expect(french?.failedLocale).toBe("de");
    expect(french?.locales).toStrictEqual(["de", "fr"]);
  });
});
