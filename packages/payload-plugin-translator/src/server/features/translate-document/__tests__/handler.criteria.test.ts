import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectionSlug, Payload } from "payload";

import { TranslatorConfigError } from "../../../../core/errors/index.js";
import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import type { Criteria } from "../../../modules/translation-run/index.js";
import type { TranslationFilter } from "../../../../core/domain/selection/index.js";
import { TranslateDocumentHandler } from "../handler.js";
import type { TranslateDocumentInput } from "../model.js";

const leaves = (...addresses: string[]): TranslationFilter => ({ kind: "leaves", addresses });
const rule = (name: string): TranslationFilter => ({ kind: "rule", name });

vi.mock("../../../../core/translation-pipeline/index.js", () => ({
  translateContent: vi.fn().mockResolvedValue(null),
}));

const SCHEMA = [
  { name: "title", type: "text", localized: true },
  { name: "subtitle", type: "text", localized: true },
  { name: "body", type: "text", localized: true },
];

const SOURCE = { id: "doc-1", title: "One", subtitle: "Two", body: "Three" };

describe("what a run translates", () => {
  let provider: TranslationProvider;
  let schemaMap: CollectionSchemaMap;
  let payload: Payload;

  const input = (overrides: Partial<TranslateDocumentInput> = {}): TranslateDocumentInput => ({
    collection: "posts" as CollectionSlug,
    collectionId: "doc-1",
    sourceLng: "en",
    targetLng: "de",
    publishOnTranslation: false,
    previousAttempts: 0,
    ...overrides,
  });

  const sentToTheProvider = async () => {
    const { translateContent } = await import("../../../../core/translation-pipeline/index.js");
    const call = (translateContent as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    return (call?.[0] as { selection?: readonly string[] })?.selection;
  };

  const run = async (over: Partial<TranslateDocumentInput>, criteria: Criteria = {}) =>
    await new TranslateDocumentHandler({
      translationProvider: provider,
      schemaMap,
      criteria,
    }).handle(payload, input(over));

  beforeEach(() => {
    vi.clearAllMocks();
    provider = { translate: vi.fn().mockResolvedValue({}) };
    schemaMap = new Map([["posts" as CollectionSlug, SCHEMA]]) as CollectionSchemaMap;
    payload = {
      findByID: vi.fn().mockResolvedValue(SOURCE),
      update: vi.fn().mockResolvedValue({}),
      logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
      collections: { posts: { config: { versions: undefined } } },
    } as unknown as Payload;
  });

  it("sends every translatable leaf when the request carries no filters", async () => {
    await run({});

    expect(await sentToTheProvider()).toEqual(["title", "subtitle", "body"]);
  });

  it("sends only the leaves a leaves filter named", async () => {
    await run({ filters: [leaves("subtitle")] });

    expect(await sentToTheProvider()).toEqual(["subtitle"]);
  });

  it("sends what a rule answers when no leaves filter was given", async () => {
    await run({ filters: [rule("drifted")] }, { drifted: async () => ["body"] });

    expect(await sentToTheProvider()).toEqual(["body"]);
  });

  it("sends only what both filters name", async () => {
    await run(
      { filters: [leaves("title", "subtitle"), rule("drifted")] },
      { drifted: async () => ["subtitle", "body"] }
    );

    expect(await sentToTheProvider()).toEqual(["subtitle"]);
  });

  it("sends nothing when the rule answers nothing the leaves filter named", async () => {
    await run({ filters: [leaves("title"), rule("drifted")] }, { drifted: async () => ["body"] });

    expect(await sentToTheProvider()).toEqual([]);
  });

  it("refuses to run rather than translate everything when a rule cannot answer", async () => {
    const angry: Criteria = {
      drifted: async () => {
        throw new Error("the store is down");
      },
    };

    await expect(run({ filters: [rule("drifted")] }, angry)).rejects.toThrow("the store is down");
    expect(provider.translate).not.toHaveBeenCalled();
  });

  it("refuses to run rather than translate everything when nothing answers the rule", async () => {
    await expect(run({ filters: [rule("nobody-answers")] })).rejects.toThrow(TranslatorConfigError);
    expect(provider.translate).not.toHaveBeenCalled();
  });

  describe("what it says when the run translated nothing", () => {
    const said = (level: "info" | "warn") =>
      (payload.logger[level] as unknown as ReturnType<typeof vi.fn>).mock.calls
        .map((call) => (call[0] as { msg?: string })?.msg)
        .join(" | ");

    it("warns that the leaves the request named are not here", async () => {
      await run({ filters: [leaves("nowhere")] });

      expect(said("warn")).toContain("named");
      expect(said("info")).not.toContain("up to date");
    });

    it("reports a rule that kept nothing as having nothing to bring up to date", async () => {
      const stale: Criteria = { stale: async () => [] };

      await run({ filters: [rule("stale")] }, stale);

      expect(said("info")).toContain("up to date");
    });

    it("does not blame a rule when the request named leaves and no rule ran", async () => {
      await run({ filters: [leaves("nowhere")] });

      expect(said("warn")).not.toContain("up to date");
    });

    it("says the document has no translatable text when it has none", async () => {
      (payload.findByID as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "doc-1" });

      await run({});

      expect(said("info")).toContain("no translatable text");
    });

    it("blames the send, not the request, when the leaves resolved and nothing came back", async () => {
      await run({});

      expect(said("warn")).toContain("was sent");
    });
  });
});
