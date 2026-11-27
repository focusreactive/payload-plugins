import { describe, expect, it, vi } from "vitest";
import type { CollectionSlug, PayloadRequest } from "payload";

import type { ProvenanceReceipt } from "../../../../core/domain/provenance/index.js";
import type { ListTranslationState } from "../../../../types/wire/ListTranslationState.js";
import { runRow, storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import { GetListStateHandler } from "../handler.js";
import { MOST_IDS_A_PAGE_MAY_ASK_ABOUT } from "../model.js";

const AT = "2026-11-01T09:00:00.000Z";

const receipt = (documentId: string, targetLocale: string): ProvenanceReceipt => ({
  collectionSlug: "posts",
  documentId,
  targetLocale,
  sourceLocale: "en",
  sourceFingerprint: null,
  translatedAt: AT,
});

type World = {
  ids?: string;
  visible?: string[];
  holding?: Record<string, string[]>;
  receipts?: ProvenanceReceipt[];
  live?: ReturnType<typeof runRow>[];
  failed?: ReturnType<typeof runRow>[];
  localization?: unknown;
};

const requestFor = (world: World): PayloadRequest => {
  const visible = world.visible ?? ["doc-1", "doc-2"];
  const payload = {
    collections: {},
    config: {
      localization:
        world.localization === undefined
          ? { defaultLocale: "en", locales: ["en", "de"] }
          : world.localization,
      collections: [{ slug: "posts", fields: [{ name: "title", type: "text" }] }],
      blocks: [],
    },
    find: vi.fn(async ({ locale, select }: { locale?: string; select?: unknown }) => {
      if (select && locale === undefined) return { docs: visible.map((id) => ({ id })) };
      return { docs: (world.holding?.[locale ?? ""] ?? []).map((id) => ({ id })) };
    }),
  };
  return {
    payload,
    user: null,
    routeParams: { collection_slug: "posts" },
    searchParams: new URLSearchParams(world.ids === undefined ? "ids=doc-1,doc-2" : world.ids),
  } as unknown as PayloadRequest;
};

const handlerFor = (world: World, keepsRecords = true) =>
  new GetListStateHandler(
    {
      availableCollections: new Set(["posts"] as CollectionSlug[]),
      holdsText: () => true,
      failedWindowMs: 60_000,
      ...(keepsRecords
        ? {
            provenance: {
              storeFactory: () =>
                ({
                  findByDocuments: async () => world.receipts ?? [],
                  findByDocument: async () => world.receipts ?? [],
                }) as never,
              stalenessFactory: () => null as never,
            },
          }
        : {}),
    },
    () =>
      storeDouble({
        findLiveForDocuments: vi.fn().mockResolvedValue(world.live ?? []),
        findRecentlyUndeliveredInCollection: vi.fn().mockResolvedValue(world.failed ?? []),
      })
  );

const answer = async (world: World, keepsRecords = true) => {
  const response = await handlerFor(world, keepsRecords).handle(requestFor(world));
  const body = (await response.json()) as { data: ListTranslationState; message?: string };
  return { status: response.status, body: body.data, message: body.message };
};

describe("which rows a list answers about", () => {
  it("answers only the ids asked for, in the order asked", async () => {
    const { status, body } = await answer({ ids: "ids=doc-2,doc-1" });

    expect(status).toBe(200);
    expect(body.collection).toBe("posts");
    expect(body.docs.map((doc) => doc.id)).toStrictEqual(["doc-2", "doc-1"]);
  });

  it("leaves out an id the caller may not read, rather than refusing the page", async () => {
    const { status, body } = await answer({ visible: ["doc-1"] });

    expect(status).toBe(200);
    expect(body.docs.map((doc) => doc.id)).toStrictEqual(["doc-1"]);
  });

  it("asks about each id once, however often it is named", async () => {
    const { body } = await answer({ ids: "ids=doc-1,doc-1,doc-2" });

    expect(body.docs.map((doc) => doc.id)).toStrictEqual(["doc-1", "doc-2"]);
  });

  it("answers about no document where none was asked about", async () => {
    const { status, body } = await answer({ ids: "" });

    expect(status).toBe(200);
    expect(body.docs).toStrictEqual([]);
  });

  it("refuses a page bigger than one, rather than cutting it short", async () => {
    const tooMany = Array.from({ length: MOST_IDS_A_PAGE_MAY_ASK_ABOUT + 1 }, (_, i) => `d${i}`);

    const { status } = await answer({ ids: `ids=${tooMany.join(",")}` });

    expect(status).toBe(400);
  });

  it("refuses a collection it does not manage, and a host with no localization", async () => {
    const unmanaged = new GetListStateHandler(
      { availableCollections: new Set(), holdsText: () => true, failedWindowMs: 0 },
      () => storeDouble()
    );

    expect((await unmanaged.handle(requestFor({}))).status).toBe(400);
    expect((await answer({ localization: false })).status).toBe(400);
  });
});

describe("what a row says about a locale", () => {
  it("says empty where the locale holds nothing", async () => {
    const { body } = await answer({ holding: {} });

    expect(body.docs[0]?.locales).toStrictEqual([
      { locale: "de", content: { kind: "empty" }, run: null },
    ]);
  });

  it("says filled, and names when a run last wrote it", async () => {
    const { body } = await answer({
      holding: { de: ["doc-1"] },
      receipts: [receipt("doc-1", "de")],
    });

    expect(body.docs[0]?.locales[0]?.content).toStrictEqual({ kind: "filled", translatedAt: AT });
  });

  it("names no time where the installation keeps no records", async () => {
    const { body } = await answer({ holding: { de: ["doc-1"] } }, false);

    expect(body.docs[0]?.locales[0]?.content).toStrictEqual({
      kind: "filled",
      translatedAt: null,
    });
  });

  it("carries a live run", async () => {
    const { body } = await answer({ live: [runRow({ collectionId: "doc-1", targetLng: "de" })] });

    expect(body.docs[0]?.locales[0]?.run).toMatchObject({ status: "queued" });
    expect(body.docs[1]?.locales[0]?.run).toBeNull();
  });

  it("carries a failure that settled recently, which no live read would return", async () => {
    const { body } = await answer({
      failed: [
        runRow({
          collectionId: "doc-2",
          targetLng: "de",
          outcome: "failed",
          settledAt: AT,
          error: "no answer",
        }),
      ],
    });

    expect(body.docs[1]?.locales[0]?.run).toMatchObject({ status: "failed" });
  });
});
