import type { CollectionConfig } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type LocaleState = { locale: string; run: { status: string } | null };

const docs: CollectionConfig = {
  slug: "docs",
  fields: [{ name: "title", type: "text", localized: true }],
};

const germanIn = (locales: LocaleState[]) => locales.find((one) => one.locale === "de")?.run;

const runAsTheDocumentShows = async (ctx: TestPayload, id: string) => {
  const res = await callEndpoint(
    ctx.payload,
    "get",
    "/translate/document-state/:collection_slug/:collection_id",
    { routeParams: { collection_slug: "docs", collection_id: id } }
  );
  return germanIn((res.data as { data: { locales: LocaleState[] } }).data.locales);
};

const runAsTheListShows = async (ctx: TestPayload, id: string) => {
  const res = await callEndpoint(ctx.payload, "get", "/translate/list-state/:collection_slug", {
    routeParams: { collection_slug: "docs" },
    query: `ids=${id}`,
  });
  return germanIn(
    (res.data as { data: { docs: { locales: LocaleState[] }[] } }).data.docs[0]!.locales
  );
};

describe("the run a locale shows is the same in the document and in the list", () => {
  let ctx: TestPayload;
  let providerDown = true;
  let retried: string;
  let failed: string;

  const translateIntoGerman = (id: string) =>
    callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: { source_lng: "en", target_lng: "de", collection_slug: "docs", collection_id: [id] },
    });

  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: [docs],
      onTranslate: (targetLng) => {
        if (providerDown && targetLng === "de") throw new Error("provider down");
      },
    });
    const create = async (title: string) =>
      String((await ctx.payload.create({ collection: "docs", locale: "en", data: { title } })).id);
    retried = await create("Retried");
    failed = await create("Failed");

    await translateIntoGerman(retried);
    await translateIntoGerman(failed);
    providerDown = false;
    await translateIntoGerman(retried);
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("shows no run once a later run delivered what an earlier one failed", async () => {
    expect(await runAsTheDocumentShows(ctx, retried)).toBeNull();
    expect(await runAsTheListShows(ctx, retried)).toBeNull();
  });

  it("shows a failure no later run replaced, in both places", async () => {
    expect((await runAsTheDocumentShows(ctx, failed))?.status).toBe("failed");
    expect((await runAsTheListShows(ctx, failed))?.status).toBe("failed");
  });
});
