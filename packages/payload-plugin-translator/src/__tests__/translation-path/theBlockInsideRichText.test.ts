import { describe, expect, it, vi } from "vitest";
import type { Block, CollectionSlug, Config, Field } from "payload";

import { AnyAccessGuard } from "../../server/shared/access/AnyAccessGuard.js";
import { documentTranslation } from "../../composition/modules/index.js";
import { translateDocumentControl } from "../../composition/components/index.js";
import { DocumentStaleness } from "../../server/modules/provenance/DocumentStaleness.service.js";
import { ProvenanceRecorder } from "../../server/modules/provenance/ProvenanceRecorder.service.js";
import type { ProvenanceStore } from "../../core/domain/provenance/index.js";
import { UNANSWERED } from "../../core/domain/provenance/index.js";
import { storeDouble } from "../../core/domain/provenance/__tests__/fixtures/provenanceStore.js";
import { translatableFields } from "../../core/domain/content-projection/translatableFields.js";
import { sourceFingerprinter } from "../../core/domain/content-projection/sourceFingerprinter.js";
import { makeIdPath } from "../../core/domain/content-projection/idPath.js";
import { translateContent } from "../../core/translation-pipeline/index.js";
import { translationLanguages } from "../../server/features/_lib/index.js";
import type { CollectionSchemaMap } from "../../types/CollectionSchemaMap.js";
import type { BlockLike } from "../../core/kernel/field-traversal/index.js";
import type { TranslatorPluginConfig } from "../../plugin.js";
import { translatorPlugin } from "../../plugin.js";

const wired = vi.fn();
vi.mock("../../server/features/translate-document/index.js", async (original) => {
  const actual =
    await original<typeof import("../../server/features/translate-document/index.js")>();
  return {
    ...actual,
    wireTranslateRunner: (params: Parameters<typeof actual.wireTranslateRunner>[0]) => {
      wired(params.translation.embeds);
      return actual.wireTranslateRunner(params);
    },
  };
});

const sorted = (keys: Iterable<string>) => [...keys].sort();

const COLLECTION = "posts" as CollectionSlug;
const DOCUMENT = "1";

const cta: Block = {
  slug: "cta",
  fields: [{ name: "heading", type: "text", localized: true }],
} as unknown as Block;

const schema: Field[] = [
  { name: "title", type: "text", localized: true },
  { name: "body", type: "richText", localized: true },
];

const richTextHolding = (heading: string) => ({
  root: {
    type: "root",
    version: 1,
    children: [
      {
        type: "paragraph",
        version: 1,
        children: [{ type: "text", version: 1, text: "Prose" }],
      },
      { type: "block", version: 2, fields: { id: "b1", blockType: "cta", heading } },
    ],
  },
});

const documentWith = (heading: string) => ({
  title: "Pricing",
  body: richTextHolding(heading),
});

const shouting = {
  translate: async (sent: Record<number, { kind: string; text?: string }>) =>
    Object.fromEntries(
      Object.entries(sent).map(([index, value]) => [
        index,
        { kind: "text", text: String(value.text).toUpperCase() },
      ])
    ),
} as unknown as Parameters<typeof translateContent>[0]["translationProvider"];

const asThePluginResolvesIt = async (embeds: Block[]): Promise<readonly BlockLike[]> => {
  wired.mockClear();
  const collection = { slug: COLLECTION, fields: schema };

  await translatorPlugin({
    collections: [collection],
    translationProvider: { translate: vi.fn() },
    access: new AnyAccessGuard(),
    runner: {
      capabilities: { stop: true, run: true },
      create: vi.fn(),
      configure: vi.fn().mockReturnValue((config: Config) => config),
    },
    modules: [documentTranslation()],
    components: [translateDocumentControl()],
    embeds,
  } as unknown as TranslatorPluginConfig)({ collections: [collection] } as unknown as Config);

  return (wired.mock.calls[0]?.[0] as readonly BlockLike[] | undefined) ?? [];
};

const headingOf = (data: Record<string, unknown>): unknown => {
  const body = data.body as { root: { children: { fields?: { heading?: unknown } }[] } };
  return body.root.children[1]?.fields?.heading;
};

const provenanceOver = (
  store: ProvenanceStore,
  readSource: (args: { locale: string }) => Promise<Record<string, unknown> | null>,
  embeds: readonly BlockLike[]
) => {
  const schemaMap: CollectionSchemaMap = new Map([[COLLECTION, schema]]);
  const logger = { error: vi.fn() };
  const fingerprintOf = sourceFingerprinter(schemaMap, translationLanguages(embeds));
  return {
    recorder: new ProvenanceRecorder(store, {}, { logger, fingerprintOf }),
    staleness: new DocumentStaleness(store, {}, { logger, readSource, fingerprintOf }),
  };
};

describe("a block embedded in a rich text", () => {
  it("is translated end to end, through the table the plugin resolved", async () => {
    const embeds = await asThePluginResolvesIt([cta]);
    const walk = translationLanguages(embeds);
    const source = documentWith("Buy now");

    const result = await translateContent({
      schema,
      sourceData: source,
      selection: translatableFields(source, schema, walk).map((field) => field.address),
      sourceLng: "en",
      targetLng: "de",
      document: { collection: COLLECTION, id: DOCUMENT },
      translationProvider: shouting,
      ...walk,
    });

    expect(result.sent).toBe(true);
    if (!result.sent) return;
    expect(headingOf(result.translatedData)).toBe("BUY NOW");
  });

  it("is not reached when its definition never arrives — nothing claims it, nothing is written", async () => {
    const walk = translationLanguages();
    const source = documentWith("Buy now");

    const result = await translateContent({
      schema,
      sourceData: source,
      selection: translatableFields(source, schema, walk).map((field) => field.address),
      sourceLng: "en",
      targetLng: "de",
      document: { collection: COLLECTION, id: DOCUMENT },
      translationProvider: shouting,
      ...walk,
    });

    expect(result.sent).toBe(true);
    if (!result.sent) return;
    expect(headingOf(result.translatedData)).toBe("Buy now");
  });
});

describe("what a run records and what the panel recomputes", () => {
  const recordThenAsk = async (args: {
    recorded: Record<string, unknown>;
    asItStandsNow: Record<string, unknown>;
    embeds: readonly BlockLike[];
    answered?: boolean;
  }) => {
    const store = storeDouble();
    const { recorder, staleness } = provenanceOver(
      store,
      async () => args.asItStandsNow,
      args.embeds
    );

    const fingerprint = recorder.captureFingerprint(COLLECTION, args.recorded);
    expect(fingerprint).not.toBeNull();
    if (!fingerprint) throw new Error("no fingerprint");

    await recorder.record(
      { collectionSlug: COLLECTION, documentId: DOCUMENT, targetLocale: "de", sourceLocale: "en" },
      fingerprint,
      Object.keys(fingerprint).map((address) =>
        args.answered === false
          ? { idPath: makeIdPath([{ kind: "key", name: address }]), answered: false, failures: [] }
          : { idPath: makeIdPath([{ kind: "key", name: address }]), answered: true }
      )
    );

    const written = store.upsert.mock.calls[0]?.[0] as { sourceFingerprint: unknown };
    store.findByDocument.mockResolvedValue([
      {
        collectionSlug: COLLECTION,
        documentId: DOCUMENT,
        targetLocale: "de",
        sourceLocale: "en",
        sourceFingerprint: written.sourceFingerprint,
        translatedAt: "2026-11-09T00:00:00.000Z",
      },
    ]);

    return {
      written: written.sourceFingerprint as Record<string, string>,
      staleness: await staleness.getStaleness(COLLECTION, DOCUMENT),
    };
  };

  it("agree on an unchanged document, so it does not read stale for ever", async () => {
    const embeds = await asThePluginResolvesIt([cta]);
    const unchanged = documentWith("Buy now");

    const { staleness } = await recordThenAsk({
      recorded: unchanged,
      asItStandsNow: documentWith("Buy now"),
      embeds,
    });

    expect(staleness[0]?.isStale).toBe(false);
    expect(staleness[0]?.changedLeaves).toEqual([]);
  });

  it("disagree once the text inside the embedded block is edited, and name the field", async () => {
    const embeds = await asThePluginResolvesIt([cta]);

    const { staleness } = await recordThenAsk({
      recorded: documentWith("Buy now"),
      asItStandsNow: documentWith("Buy today"),
      embeds,
    });

    expect(staleness[0]?.isStale).toBe(true);
    expect(staleness[0]?.changedLeaves).toEqual(["body"]);
  });

  it("records the field as unanswered when the run could not translate it", async () => {
    const embeds = await asThePluginResolvesIt([cta]);

    const { written } = await recordThenAsk({
      recorded: documentWith("Buy now"),
      asItStandsNow: documentWith("Buy now"),
      embeds,
      answered: false,
    });

    expect(written.body).toBe(UNANSWERED);
  });
});

describe("every reader of an address agrees on the set", () => {
  const addressesEachReaderOffers = async (document: Record<string, unknown>) => {
    const embeds = await asThePluginResolvesIt([cta]);
    const walk = translationLanguages(embeds);
    const store = storeDouble({
      find: vi.fn().mockResolvedValue({
        collectionSlug: COLLECTION,
        documentId: DOCUMENT,
        targetLocale: "de",
        sourceLocale: "en",
        sourceFingerprint: {},
        translatedAt: "2026-11-09T00:00:00.000Z",
      }),
    });
    const { recorder, staleness } = provenanceOver(store, async () => document, embeds);

    const field = schema.filter((one) => "name" in one && one.name === "body");

    await staleness.dismiss({
      collectionSlug: COLLECTION,
      documentId: DOCUMENT,
      targetLocale: "de",
    });
    const panel = store.rebaseSourceFingerprint.mock.calls[0]?.[1] as Record<string, string>;

    return {
      documentRunSelection: sorted(
        translatableFields(document, schema, walk).map((one) => String(one.address))
      ),
      fieldRunSelection: sorted(
        translatableFields(document, field, walk).map((one) => String(one.address))
      ),
      theRunsFingerprint: sorted(
        Object.keys(recorder.captureFingerprint(COLLECTION, document) ?? {})
      ),
      thePanelsFingerprint: sorted(Object.keys(panel)),
    };
  };

  it("with a block inside the rich text", async () => {
    const read = await addressesEachReaderOffers(documentWith("Buy now"));

    expect(read.theRunsFingerprint).toEqual(read.documentRunSelection);
    expect(read.thePanelsFingerprint).toEqual(read.documentRunSelection);
    expect(read.fieldRunSelection).toEqual(["body"]);
  });

  it("with a rich text whose only text is inside the block", async () => {
    const read = await addressesEachReaderOffers({
      title: "Pricing",
      body: {
        root: {
          type: "root",
          version: 1,
          children: [
            {
              type: "block",
              version: 2,
              fields: { id: "b1", blockType: "cta", heading: "Buy now" },
            },
          ],
        },
      },
    });

    expect(read.theRunsFingerprint).toEqual(read.documentRunSelection);
    expect(read.thePanelsFingerprint).toEqual(read.documentRunSelection);
    expect(read.documentRunSelection).toEqual(["body", "title"]);
  });

  it("with nothing embedded in it", async () => {
    const read = await addressesEachReaderOffers({
      title: "Pricing",
      body: {
        root: {
          type: "root",
          version: 1,
          children: [
            {
              type: "paragraph",
              version: 1,
              children: [{ type: "text", version: 1, text: "Prose" }],
            },
          ],
        },
      },
    });

    expect(read.theRunsFingerprint).toEqual(read.documentRunSelection);
    expect(read.thePanelsFingerprint).toEqual(read.documentRunSelection);
    expect(read.documentRunSelection).toEqual(["body", "title"]);
  });
});
