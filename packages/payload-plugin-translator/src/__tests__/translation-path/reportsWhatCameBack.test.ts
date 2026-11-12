import { describe, expect, it, vi } from "vitest";

import { translationLanguages } from "../../server/features/_lib/translationLanguages.js";
import type { Field } from "payload";

import type { ProvenanceStore } from "../../core/domain/provenance/index.js";
import { UNANSWERED } from "../../core/domain/provenance/index.js";
import { asHash } from "../../core/domain/provenance/__tests__/fixtures/claims.js";
import type { CollectionSchemaMap } from "../../types/CollectionSchemaMap.js";
import { ProvenanceService } from "../../server/modules/provenance/Provenance.service.js";
import type {
  SegmentId,
  TranslatableValue,
  TranslatedValue,
  TranslationInput,
  TranslationOutput,
  TranslationProvider,
} from "../../core/domain/translation-providers/index.js";
import { projectTranslatableContent } from "../../core/domain/content-projection/contentProjector.js";
import { TranslationPipeline } from "../../core/translation-pipeline/TranslationPipeline.js";
import { storeDouble } from "../../core/domain/provenance/__tests__/fixtures/provenanceStore.js";
import { fingerprintsOf } from "../../server/modules/provenance/__tests__/fixtures/fingerprinter.js";

const hashed = (fields: Record<string, string>) =>
  Object.fromEntries(Object.entries(fields).map(([address, seed]) => [address, asHash(seed)]));

type Answers = (sent: TranslationInput) => TranslationOutput;

const provider = (answer: Answers): TranslationProvider => ({
  translate: vi.fn(async (sent: TranslationInput) => answer(sent)),
});

const inGerman = (value: TranslatableValue): TranslatedValue =>
  value.kind === "text"
    ? { kind: "text", text: `[de] ${value.text}` }
    : {
        kind: "segments",
        segments: value.segments.map((s) => ({ id: s.id, text: `[de] ${s.text ?? ""}` })),
      };

const answerEach =
  (answer: (value: TranslatableValue) => TranslatedValue | undefined): Answers =>
  (sent) => {
    const out: TranslationOutput = {};
    for (const [key, value] of Object.entries(sent)) {
      const answered = answer(value);
      if (answered) out[Number(key)] = answered;
    }
    return out;
  };

const everything: Answers = answerEach(inGerman);

const segments = (...pairs: [SegmentId, string][]): TranslatedValue => ({
  kind: "segments",
  segments: pairs.map(([id, text]) => ({ id, text })),
});

const segmentsTheCheckAccepts: Answers = answerEach((value) =>
  value.kind === "segments" ? segments([1, "Etwas "], [2, "Prosa"]) : inGerman(value)
);

const everythingAnsweredAsText: Answers = answerEach(() => ({
  kind: "text",
  text: "no segments at all",
}));

const onlyIndex =
  (kept: number): Answers =>
  (sent) => {
    const value = sent[kept];
    return value === undefined ? {} : { [kept]: inGerman(value) };
  };

const allExcept = (dropped: string): Answers =>
  answerEach((value) =>
    value.kind === "text" && value.text === dropped ? undefined : inGerman(value)
  );

const run = async (args: { schema: Field[]; source: Record<string, unknown>; answer: Answers }) =>
  new TranslationPipeline({ translationProvider: provider(args.answer) }).execute({
    document: { collection: "posts", id: "1" },
    schema: args.schema,
    sourceData: args.source,
    targetData: {},
    sourceLng: "en",
    targetLng: "de",
    selection: projectTranslatableContent(args.source, args.schema).map((entry) =>
      String(entry.idPath)
    ),
    ...translationLanguages(),
  });

const leavesOf = (result: Awaited<ReturnType<typeof run>>) => (result.sent ? result.leaves : []);

const claimable = (result: Awaited<ReturnType<typeof run>>): string[] =>
  leavesOf(result)
    .filter((leaf) => leaf.answered)
    .map((leaf) => String(leaf.idPath));

const paragraphs = (...each: string[][]) => ({
  root: {
    type: "root",
    version: 1,
    children: each.map((texts) => ({
      type: "paragraph",
      version: 1,
      children: texts.map((text) => ({ type: "text", version: 1, text })),
    })),
  },
});

const paragraph = (...texts: string[]) => paragraphs(texts);

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

  it("leaves out a rich-text leaf whose container answer fails the check, though an answer came back", async () => {
    const schema: Field[] = [
      { name: "title", type: "text", localized: true },
      { name: "body", type: "richText", localized: true },
    ];
    const result = await run({
      schema,
      source: { title: "Hello", body: paragraph("Some ", "prose") },
      answer: everythingAnsweredAsText,
    });

    expect(claimable(result)).toEqual(["title"]);
  });

  it("names a rich-text leaf whose container answer passed the check", async () => {
    const schema: Field[] = [{ name: "body", type: "richText", localized: true }];
    const result = await run({
      schema,
      source: { body: paragraph("Some ", "prose") },
      answer: segmentsTheCheckAccepts,
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
      source: { title: "Hello", body: paragraphs(["First"], ["Second"]) },
      answer: everything,
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
      source: { title: "Hello", body: paragraphs(["First"], ["Second"]) },
      answer: allExcept("Second"),
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
      {},
      {
        logger: { error: vi.fn() },
        readSource: vi.fn(),
        fingerprintOf: fingerprintsOf(new Map([["posts", twoTexts]]) as CollectionSchemaMap),
      }
    );

    await service.record(
      { collectionSlug: "posts", documentId: "1", targetLocale: "de", sourceLocale: "en" },
      hashed({ title: "aaaa", summary: "bbbb" }),
      leavesOf(result)
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
      {},
      {
        logger: { error: vi.fn() },
        readSource: vi.fn(),
        fingerprintOf: fingerprintsOf(new Map([["posts", twoTexts]]) as CollectionSchemaMap),
      }
    );

    await service.record(
      { collectionSlug: "posts", documentId: "1", targetLocale: "de", sourceLocale: "en" },
      hashed({ title: "aaaa", summary: "bbbb" }),
      leavesOf(result)
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

describe("a refused reply says why", () => {
  const titleAndBody: Field[] = [
    { name: "title", type: "text", localized: true },
    { name: "body", type: "richText", localized: true },
  ];

  it("names the leaf and the check's reason when a paragraph's answer comes back in the wrong kind", async () => {
    const result = await run({
      schema: titleAndBody,
      source: { title: "Pricing", body: paragraph("Some ", "prose") },
      answer: everythingAnsweredAsText,
    });

    expect(leavesOf(result)).toEqual([
      { idPath: "title", answered: true },
      { idPath: "body", answered: false, failures: [{ code: "wrong-kind" }] },
    ]);
  });

  it("reports no failure when every paragraph's answer passes the check", async () => {
    const result = await run({
      schema: titleAndBody,
      source: { title: "Pricing", body: paragraph("Some ", "prose") },
      answer: segmentsTheCheckAccepts,
    });

    expect(leavesOf(result)).toEqual([
      { idPath: "title", answered: true },
      { idPath: "body", answered: true },
    ]);
  });

  it("names every refused paragraph of a leaf, each with its own reason, and none that passed", async () => {
    const replies = [
      segments([1, "Etwas "], [2, "Prosa"]),
      segments([1, "Mehr "]),
      segments([1, "eins"], [1, "zwei"], [2, "drei"]),
    ];
    const result = await run({
      schema: titleAndBody,
      source: {
        title: "Pricing",
        body: paragraphs(["Some ", "prose"], ["More ", "prose"], ["Last ", "prose"]),
      },
      answer: answerEach((value) =>
        value.kind === "segments" ? replies.shift() : inGerman(value)
      ),
    });

    expect(leavesOf(result)).toEqual([
      { idPath: "title", answered: true },
      {
        idPath: "body",
        answered: false,
        failures: [{ code: "missing-segment" }, { code: "repeated-segment" }],
      },
    ]);
  });
});
