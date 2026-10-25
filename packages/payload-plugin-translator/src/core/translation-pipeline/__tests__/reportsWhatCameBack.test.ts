import { describe, expect, it, vi } from "vitest";
import type { Field } from "payload";

import type { ProvenanceStore } from "../../domain/provenance/index.js";
import { UNANSWERED } from "../../domain/provenance/index.js";
import { asHash } from "../../domain/provenance/__tests__/fixtures/claims.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import { ProvenanceService } from "../../../server/modules/provenance/Provenance.service.js";
import type { TranslationProvider } from "../../domain/translation-providers/index.js";
import {
  PlainTextExpander,
  RichContainerExpander,
  RichTextExpander,
} from "../stages/text-expander/index.js";
import { projectTranslatableContent } from "../../domain/content-projection/contentProjector.js";
import { TranslationPipeline } from "../TranslationPipeline.js";
import type { TextExpander } from "../stages/index.js";
import { storeDouble } from "../../domain/provenance/__tests__/fixtures/provenanceStore.js";

const hashed = (fields: Record<string, string>) =>
  Object.fromEntries(Object.entries(fields).map(([address, seed]) => [address, asHash(seed)]));

type Answers = (sent: Record<number, string>) => Record<number, string>;

const provider = (answer: Answers): TranslationProvider => ({
  translate: vi.fn(async (sent: Record<number, string>) => answer(sent)),
});

const everything: Answers = (sent) =>
  Object.fromEntries(Object.entries(sent).map(([key, text]) => [key, `[de] ${text}`]));

const marksTheParserAccepts: Answers = (sent) =>
  Object.fromEntries(Object.keys(sent).map((key) => [Number(key), "<1>Etwas </1><2>Prosa</2>"]));

const marksTheParserRefuses: Answers = (sent) =>
  Object.fromEntries(Object.keys(sent).map((key) => [Number(key), "no marks at all"]));

const onlyIndex =
  (kept: number): Answers =>
  (sent) =>
    kept in sent ? { [kept]: `[de] ${sent[kept]}` } : {};

const allExcept =
  (dropped: string): Answers =>
  (sent) =>
    Object.fromEntries(
      Object.entries(sent)
        .filter(([, text]) => text !== dropped)
        .map(([key, text]) => [Number(key), `[de] ${text}`])
    );

const run = async (args: {
  schema: Field[];
  source: Record<string, unknown>;
  answer: Answers;
  expanders?: TextExpander[];
}) =>
  new TranslationPipeline({
    translationProvider: provider(args.answer),
    textExpanders: args.expanders,
  }).execute({
    document: { collection: "posts", id: "1" },
    schema: args.schema,
    sourceData: args.source,
    targetData: {},
    sourceLng: "en",
    targetLng: "de",
    selection: projectTranslatableContent(args.source, args.schema).map((entry) =>
      String(entry.idPath)
    ),
  });

const claimable = (result: Awaited<ReturnType<typeof run>>): string[] =>
  (result?.leaves ?? []).filter((leaf) => leaf.answeredInFull).map((leaf) => String(leaf.idPath));

const paragraph = (...texts: string[]) => ({
  root: {
    type: "root",
    version: 1,
    children: [
      {
        type: "paragraph",
        version: 1,
        children: texts.map((text) => ({ type: "text", version: 1, text })),
      },
    ],
  },
});

const twoTexts: Field[] = [
  { name: "title", type: "text", localized: true },
  { name: "summary", type: "text", localized: true },
];

describe("a run reports the leaves that came back", () => {
  it("leaves out a leaf the model left unanswered, and keeps its answered sibling", async () => {
    const result = await run({
      schema: twoTexts,
      source: { title: "Hello", summary: "World" },
      answer: onlyIndex(0),
    });

    expect(claimable(result)).toEqual(["title"]);
  });

  it("names a leaf answered in full", async () => {
    const result = await run({
      schema: twoTexts,
      source: { title: "Hello", summary: "World" },
      answer: everything,
    });

    expect(claimable(result)).toEqual(["title", "summary"]);
  });

  it("leaves out a rich-text leaf whose container reply is unparsable, though a string came back", async () => {
    const schema: Field[] = [
      { name: "title", type: "text", localized: true },
      { name: "body", type: "richText", localized: true },
    ];
    const result = await run({
      schema,
      source: { title: "Hello", body: paragraph("Some ", "prose") },
      answer: marksTheParserRefuses,
      expanders: [new RichContainerExpander(), new PlainTextExpander()],
    });

    expect(claimable(result)).toEqual(["title"]);
  });

  it("names a rich-text leaf whose container reply parsed", async () => {
    const schema: Field[] = [{ name: "body", type: "richText", localized: true }];
    const result = await run({
      schema,
      source: { body: paragraph("Some ", "prose") },
      answer: marksTheParserAccepts,
      expanders: [new RichContainerExpander(), new PlainTextExpander()],
    });

    expect(claimable(result)).toEqual(["body"]);
  });

  it("names a leaf cut into several chunks when every one of them came back", async () => {
    const schema: Field[] = [
      { name: "title", type: "text", localized: true },
      { name: "body", type: "richText", localized: true },
    ];

    const result = await run({
      schema,
      source: { title: "Hello", body: paragraph("First", "Second") },
      answer: everything,
      expanders: [new RichTextExpander(), new PlainTextExpander()],
    });

    expect(claimable(result)).toEqual(["title", "body"]);
  });

  it("leaves out a leaf that came back only partly, when it was cut into several chunks", async () => {
    const schema: Field[] = [
      { name: "title", type: "text", localized: true },
      { name: "body", type: "richText", localized: true },
    ];

    const result = await run({
      schema,
      source: { title: "Hello", body: paragraph("First", "Second") },
      answer: allExcept("Second"),
      expanders: [new RichTextExpander(), new PlainTextExpander()],
    });

    expect(claimable(result)).toStrictEqual(["title"]);
  });

  it("leaves out a rich-text leaf whose tree holds no text, so it produced no chunks", async () => {
    const schema: Field[] = [
      { name: "title", type: "text", localized: true },
      { name: "body", type: "richText", localized: true },
    ];

    const result = await run({
      schema,
      source: { title: "Hello", body: paragraph("   ", "") },
      answer: everything,
      expanders: [new RichTextExpander(), new PlainTextExpander()],
    });

    expect(claimable(result)).toEqual(["title"]);
  });

  it("leaves out a collected leaf that produced no chunks at all", async () => {
    const schema: Field[] = [
      { name: "title", type: "text", localized: true },
      { name: "count", type: "text", localized: true },
    ];

    const result = await run({
      schema,
      source: { title: "Hello", count: 42 },
      answer: everything,
    });

    expect(claimable(result)).toEqual(["title"]);
  });
});

describe("what the run reports is what the receipt claims", () => {
  const store = (
    previous: unknown = null
  ): ProvenanceStore & { upsert: ReturnType<typeof vi.fn> } =>
    storeDouble({ find: vi.fn().mockResolvedValue(previous) });

  it("declines the unanswered leaf rather than sealing its current source hash", async () => {
    const result = await run({
      schema: twoTexts,
      source: { title: "Hello", summary: "World" },
      answer: onlyIndex(0),
    });

    const written = store();
    const service = new ProvenanceService(
      written,
      new Map([["posts", twoTexts]]) as CollectionSchemaMap,
      {},
      { logger: { error: vi.fn() }, readSource: vi.fn() }
    );

    await service.record(
      { collectionSlug: "posts", documentId: "1", targetLocale: "de", sourceLocale: "en" },
      hashed({ title: "aaaa", summary: "bbbb" }),
      result?.leaves ?? []
    );

    const stored = written.upsert.mock.calls[0]?.[0] as {
      sourceFingerprint: { hashes: Record<string, string | null> };
    };

    expect(stored.sourceFingerprint).toEqual({
      title: asHash("aaaa"),
      summary: UNANSWERED,
    });
  });

  it("keeps the claim an earlier receipt made for the leaf this run could not translate", async () => {
    const result = await run({
      schema: twoTexts,
      source: { title: "Hello", summary: "World" },
      answer: onlyIndex(0),
    });

    const written = store({
      collectionSlug: "posts",
      documentId: "1",
      targetLocale: "de",
      sourceLocale: "en",
      sourceFingerprint: hashed({ title: "0d", summary: "0dbb" }),
      translatedAt: "2026-01-01T00:00:00.000Z",
    });
    const service = new ProvenanceService(
      written,
      new Map([["posts", twoTexts]]) as CollectionSchemaMap,
      {},
      { logger: { error: vi.fn() }, readSource: vi.fn() }
    );

    await service.record(
      { collectionSlug: "posts", documentId: "1", targetLocale: "de", sourceLocale: "en" },
      hashed({ title: "aaaa", summary: "bbbb" }),
      result?.leaves ?? []
    );

    const stored = written.upsert.mock.calls[0]?.[0] as {
      sourceFingerprint: { hashes: Record<string, string | null> };
    };

    expect(stored.sourceFingerprint).toEqual({
      title: asHash("aaaa"),
      summary: UNANSWERED,
    });
  });
});
