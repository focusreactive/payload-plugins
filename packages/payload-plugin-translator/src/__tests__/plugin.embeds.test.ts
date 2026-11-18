import { describe, expect, it, vi } from "vitest";
import type { Block, Config } from "payload";

import { documentTranslation } from "../composition/modules/index.js";
import { translateDocumentControl } from "../composition/components/index.js";
import type { BlockLike } from "../core/kernel/field-traversal/index.js";
import type { TranslatorPluginConfig } from "../plugin.js";
import { translatorPlugin } from "../plugin.js";
import { AnyAccessGuard } from "../server/shared/access/AnyAccessGuard.js";

vi.mock("../core/translation-pipeline/index.js", async () => {
  const { nothingSent } =
    await import("../core/translation-pipeline/__tests__/fixtures/pipelineResult.js");
  return { translateContent: vi.fn().mockResolvedValue(nothingSent) };
});

const wired = vi.fn();
vi.mock("../server/features/translate-document/index.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../server/features/translate-document/index.js")>();
  return {
    ...original,
    wireTranslateRunner: (params: { translation: { embeds?: readonly BlockLike[] } }) => {
      wired(params.translation.embeds);
      return original.wireTranslateRunner(
        params as Parameters<typeof original.wireTranslateRunner>[0]
      );
    },
  };
});

const cta = (heading = "heading"): Block =>
  ({ slug: "cta", fields: [{ name: heading, type: "text", localized: true }] }) as unknown as Block;

const mention = (): Block =>
  ({
    slug: "mention",
    fields: [{ name: "label", type: "text", localized: true }],
  }) as unknown as Block;

/** The resolved table the plugin hands on, keyed by slug. */
const resolve = async (options: {
  blocks?: Block[];
  embeds?: Block[];
}): Promise<readonly BlockLike[]> => {
  wired.mockClear();
  const collection = { slug: "posts", fields: [{ name: "title", type: "text", localized: true }] };
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
    ...(options.embeds ? { embeds: options.embeds } : {}),
  } as unknown as TranslatorPluginConfig)({
    collections: [collection],
    ...(options.blocks ? { blocks: options.blocks } : {}),
  } as unknown as Config);

  return (wired.mock.calls[0]?.[0] as readonly BlockLike[] | undefined) ?? [];
};

/** Keyed for the cases that ask about one slug; `resolve` stays raw so counts can be asserted. */
const bySlug = (table: readonly BlockLike[]): Map<string, BlockLike["fields"]> =>
  new Map(table.map((block) => [block.slug, block.fields]));

describe("the blocks the plugin resolves for rich-text embeds", () => {
  it("takes a block declared in the Payload config, with no option at all", async () => {
    expect(bySlug(await resolve({ blocks: [cta()] })).has("cta")).toBe(true);
  });

  it("takes a block the option supplies, which the config never declared", async () => {
    expect(bySlug(await resolve({ embeds: [cta()] })).has("cta")).toBe(true);
  });

  it("adds rather than narrows: naming one in the option keeps the config's own", async () => {
    const table = bySlug(await resolve({ blocks: [cta()], embeds: [mention()] }));

    expect([...table.keys()].sort()).toEqual(["cta", "mention"]);
  });

  it("resolves a slug in both sources to the option's definition, the deliberate one", async () => {
    const table = bySlug(
      await resolve({ blocks: [cta("fromConfig")], embeds: [cta("fromOption")] })
    );

    expect(table.get("cta")?.map((field) => field.name)).toEqual(["fromOption"]);
  });

  it("holds nothing for a block neither source declares, and does not fail the boot", async () => {
    expect(await resolve({})).toEqual([]);
  });
});

describe("a resolved block against Payload's in-place sanitizer", () => {
  it("keeps the nested `localized` the sanitizer deletes from the original", async () => {
    const block = cta();
    const resolved = bySlug(await resolve({ embeds: [block] }));

    // Exactly what `sanitizeFields` does to a field under a localized ancestor, which a rich-text
    // field embedding blocks always is.
    for (const field of block.fields) delete (field as { localized?: boolean }).localized;

    // Without this the case would pass on an absent flag, i.e. on the very loss it is written for.
    expect(resolved.get("cta")?.[0]?.localized).toBe(true);
  });
});

const section = (): Block =>
  ({
    slug: "section",
    fields: [{ name: "inner", type: "blocks", blockReferences: ["cta"] }],
  }) as unknown as Block;

const wrapper = (): Block =>
  ({
    slug: "wrapper",
    fields: [{ name: "inner", type: "blocks", blockReferences: ["cta"] }],
  }) as unknown as Block;

/** The slugs a resolved block reaches through its own `blockReferences`. */
const nestedOf = (table: readonly BlockLike[], slug: string): (string | undefined)[] =>
  (bySlug(table).get(slug)?.[0]?.blocks ?? []).map((block) => block.slug);

describe("a block that reaches another block by slug", () => {
  it("resolves it when both arrive through the option", async () => {
    const table = await resolve({ embeds: [section(), cta()] });

    expect(nestedOf(table, "section")).toEqual(["cta"]);
  });

  it("resolves the option's definition, not the config's, when the option overrides the slug", async () => {
    const table = bySlug(
      await resolve({ blocks: [cta("fromConfig"), wrapper()], embeds: [cta("fromOption")] })
    );

    expect(table.get("wrapper")?.[0]?.blocks?.[0]?.fields.map((f) => f.name)).toEqual([
      "fromOption",
    ]);
  });

  it("holds one entry per slug, so no later reader has to break the tie", async () => {
    // Read from the array the plugin produced, not from a map rebuilt here: a map would dedupe on
    // its own and the case would pass against the very duplication it is written for.
    const table = await resolve({ blocks: [cta("fromConfig")], embeds: [cta("fromOption")] });

    expect(table.map((block) => block.slug)).toEqual(["cta"]);
  });
});
