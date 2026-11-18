import { describe, it, expect, vi } from "vitest";
import type { CollectionConfig, Config, PayloadRequest } from "payload";

import { translatorPlugin } from "../../../../plugin.js";
import type { TranslatorPluginConfig } from "../../../../plugin.js";
import { createSyncRunner } from "../../task-runner/sync-runner/index.js";
import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";
import { documentTranslation } from "../../../../composition/modules/index.js";
import { TranslatorConfigError } from "../../../../core/errors/index.js";
import { DEFAULT_RUNS_SLUG, isRunRecordCollection } from "../RunRecord.collection.js";

const provider: TranslationProvider = { translate: vi.fn().mockResolvedValue({}) };

const postsFixture = (): CollectionConfig => ({
  slug: "posts",
  fields: [{ name: "title", type: "text", localized: true }],
});

const boot = async (
  alongside: CollectionConfig[] = [],
  runs?: TranslatorPluginConfig["runs"]
): Promise<Config> => {
  const posts = postsFixture();
  const hostCollections = [posts, ...alongside];
  const options: TranslatorPluginConfig = {
    collections: [posts],
    translationProvider: provider,
    runner: createSyncRunner(),
    access: { check: () => true },
    modules: [documentTranslation()],
    components: [],
    runs,
  };

  return await translatorPlugin(options)({
    collections: hostCollections,
    localization: { defaultLocale: "en", locales: ["en", "de"] },
  } as unknown as Config);
};

const anyAsk = { req: {} as unknown as PayloadRequest };

const theRunRecord = (config: Config): CollectionConfig => {
  const found = (config.collections ?? []).find((collection) => isRunRecordCollection(collection));
  if (!found) throw new Error("the plugin registered no run record collection");
  return found;
};

describe("registering the run record", () => {
  it("registers the collection under its default slug", async () => {
    const config = await boot();

    expect(theRunRecord(config).slug).toBe(DEFAULT_RUNS_SLUG);
  });

  it("honours the configured slug", async () => {
    const config = await boot([], { slug: "our-runs" });

    expect(theRunRecord(config).slug).toBe("our-runs");
    expect((config.collections ?? []).map((c) => c.slug)).not.toContain(DEFAULT_RUNS_SLUG);
  });

  it("leaves the record closed to everyone and out of the admin", async () => {
    const record = theRunRecord(await boot());

    expect(record.admin?.hidden).toBe(true);
    expect(record.access?.read?.(anyAsk)).toBe(false);
    expect(record.access?.create?.(anyAsk)).toBe(false);
    expect(record.access?.update?.(anyAsk)).toBe(false);
    expect(record.access?.delete?.(anyAsk)).toBe(false);
  });

  it("refuses to boot when the slug collides with a host collection", async () => {
    const collider = (): CollectionConfig[] => [{ slug: DEFAULT_RUNS_SLUG, fields: [] }];

    await expect(boot(collider())).rejects.toThrow(TranslatorConfigError);
    await expect(boot(collider())).rejects.toThrow(/runs\.slug/u);
  });

  it("registers one record however often the plugin is applied", async () => {
    const posts = postsFixture();
    const once = await translatorPlugin({
      collections: [posts],
      translationProvider: provider,
      runner: createSyncRunner(),
      access: { check: () => true },
      modules: [documentTranslation()],
      components: [],
    })({
      collections: [posts],
      localization: { defaultLocale: "en", locales: ["en", "de"] },
    } as unknown as Config);
    const twice = await translatorPlugin({
      collections: [posts],
      translationProvider: provider,
      runner: createSyncRunner(),
      access: { check: () => true },
      modules: [documentTranslation()],
      components: [],
    })(once);

    const records = (twice.collections ?? []).filter((collection) =>
      isRunRecordCollection(collection)
    );
    expect(records).toHaveLength(1);
  });
});

describe("the cascade that follows a deleted document", () => {
  it("hooks every translatable collection", async () => {
    const config = await boot();

    const hooked = (config.collections ?? []).find((c) => c.slug === "posts");
    expect(hooked?.hooks?.afterDelete ?? []).toHaveLength(1);
  });

  it("never hooks the record itself, so the cascade cannot recurse", async () => {
    const record = theRunRecord(await boot());

    expect(record.hooks?.afterDelete ?? []).toHaveLength(0);
  });

  it("hooks no collection the plugin does not translate", async () => {
    const config = await boot([{ slug: "media", fields: [] }]);

    const other = (config.collections ?? []).find((c) => c.slug === "media");
    expect(other?.hooks?.afterDelete ?? []).toHaveLength(0);
  });
});
