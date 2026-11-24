import { describe, expect, it, vi } from "vitest";
import type { CollectionSlug, PayloadRequest } from "payload";

import { AUTO_TRANSLATE_CUSTOM_KEY } from "../../../../core/domain/auto-translate/index.js";
import { sourceFingerprinter } from "../../../../core/domain/content-projection/sourceFingerprinter.js";
import type { ProvenanceReceipt } from "../../../../core/domain/provenance/index.js";
import type { FieldLike } from "../../../../core/kernel/field-traversal/index.js";
import type { DocumentTranslationState } from "../../../../types/wire/DocumentTranslationState.js";
import { storeDouble, runRow } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import { translationLanguages } from "../../_lib/index.js";
import { GetDocumentStateHandler } from "../handler.js";

const fields: FieldLike[] = [
  { name: "title", type: "text", localized: true },
  { name: "summary", type: "text", localized: true },
];

const DOCUMENT = { id: "doc-1", title: "An English title", summary: "An English summary" };
const AT = "2026-11-01T09:00:00.000Z";

const schemaMap = new Map([["posts" as CollectionSlug, fields]]);
const fingerprintOf = sourceFingerprinter(schemaMap, translationLanguages());

const receipt = (over: Partial<ProvenanceReceipt> = {}): ProvenanceReceipt => ({
  collectionSlug: "posts",
  documentId: "doc-1",
  targetLocale: "de",
  sourceLocale: "en",
  sourceFingerprint: fingerprintOf("posts", DOCUMENT),
  translatedAt: AT,
  ...over,
});

type World = {
  document?: Record<string, unknown> | null;
  holding?: readonly string[];
  receipts?: ProvenanceReceipt[];
  rows?: ReturnType<typeof runRow>[];
  localization?: unknown;
  collectionCustom?: Record<string, unknown>;
};

const requestFor = (world: World): PayloadRequest => {
  const document = world.document === undefined ? DOCUMENT : world.document;
  const payload = {
    collections: {},
    config: {
      localization:
        world.localization === undefined
          ? { defaultLocale: "en", locales: ["en", "de", "fr"] }
          : world.localization,
      collections: [
        {
          slug: "posts",
          fields: [
            { name: "title", type: "text", label: "Title", required: true },
            { name: "summary", type: "text" },
          ],
          ...(world.collectionCustom ? { custom: world.collectionCustom } : {}),
        },
      ],
      blocks: [],
    },
    findByID: vi.fn().mockResolvedValue(document),
    find: vi.fn(async ({ locale }: { locale: string }) => ({
      docs: (world.holding ?? []).includes(locale) ? [{ id: "doc-1" }] : [],
    })),
  };
  return {
    payload,
    user: null,
    routeParams: { collection_slug: "posts", collection_id: "doc-1" },
  } as unknown as PayloadRequest;
};

const handlerFor = (world: World, keepsRecords = true) =>
  new GetDocumentStateHandler(
    {
      availableCollections: new Set(["posts"] as CollectionSlug[]),
      schemaMap,
      fingerprintOf,
      holdsText: () => true,
      ...(keepsRecords
        ? {
            provenance: {
              storeFactory: () =>
                ({
                  findByDocument: async () => world.receipts ?? [],
                }) as never,
              stalenessFactory: () => null as never,
            },
          }
        : {}),
    },
    () => storeDouble({ findByDocument: vi.fn().mockResolvedValue(world.rows ?? []) })
  );

const answer = async (world: World, keepsRecords = true) => {
  const response = await handlerFor(world, keepsRecords).handle(requestFor(world));
  const payload = (await response.json()) as { data: DocumentTranslationState; message?: string };
  return { status: response.status, body: payload.data, message: payload.message };
};

describe("refusing to answer", () => {
  it("refuses a collection it does not manage", async () => {
    const handler = new GetDocumentStateHandler(
      {
        availableCollections: new Set(),
        schemaMap,
        fingerprintOf,
        holdsText: () => true,
      },
      () => storeDouble()
    );

    const response = await handler.handle(requestFor({}));

    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain("not available for translation");
  });

  it("refuses a host with no localization, since there is no locale to answer about", async () => {
    const { status, message } = await answer({ localization: false });

    expect(status).toBe(400);
    expect(message).toContain("Localization is not");
  });

  it("answers 404 for a document the read did not produce, absent or unreadable alike", async () => {
    const { status } = await answer({ document: null });

    expect(status).toBe(404);
  });
});

describe("what the answer carries about the document", () => {
  it("names the source locale, the shape and the fields nothing translates", async () => {
    const { status, body } = await answer({});

    expect(status).toBe(200);
    expect(body.sourceLocale).toBe("en");
    expect(body.collection).toBe("posts");
    expect(body.tree).toStrictEqual([
      { kind: "leaf", label: "Title", address: "title", required: true },
      { kind: "leaf", label: "Summary", address: "summary", required: false },
    ]);
    expect(body.excluded).toStrictEqual([]);
  });

  it("answers about every locale but the source", async () => {
    const { body } = await answer({});

    expect(body.locales.map((one) => one.locale)).toStrictEqual(["de", "fr"]);
  });

  it("translates from the locale the collection names, not the project default", async () => {
    const { body } = await answer({
      collectionCustom: { [AUTO_TRANSLATE_CUSTOM_KEY]: { sourceLocale: "fr", targets: ["de"] } },
    });

    expect(body.sourceLocale).toBe("fr");
    expect(body.locales.map((one) => one.locale)).toStrictEqual(["en", "de"]);
  });
});

describe("what the answer carries about each locale", () => {
  it("reads a locale holding nothing as empty", async () => {
    const { body } = await answer({ holding: [] });

    expect(body.locales[0]?.content).toStrictEqual({ kind: "empty" });
  });

  it("reads a locale holding content with no record as written by hand", async () => {
    const { body } = await answer({ holding: ["de"] });

    expect(body.locales[0]?.content).toStrictEqual({ kind: "untracked" });
  });

  it("reads a recorded locale as tracked, with a verdict per leaf", async () => {
    const { body } = await answer({ holding: ["de"], receipts: [receipt()] });

    expect(body.locales[0]?.content).toStrictEqual({
      kind: "tracked",
      verdicts: { title: "current", summary: "current" },
      translatedAt: AT,
    });
  });

  it("reads content as filled where the installation keeps no records", async () => {
    const { body } = await answer({ holding: ["de"] }, false);

    expect(body.locales[0]?.content).toStrictEqual({ kind: "filled" });
  });

  it("carries the run a locale is waiting on, and nothing where none is", async () => {
    const { body } = await answer({ rows: [runRow({ targetLng: "de" })] });

    expect(body.locales[0]?.run).toMatchObject({ status: "queued", locales: ["de"] });
    expect(body.locales[1]?.run).toBeNull();
  });
});
