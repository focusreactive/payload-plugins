import { describe, it, expect, vi } from "vitest";
import type { CollectionConfig, Config } from "payload";

import { translatorPlugin } from "../plugin.js";
import type { TranslatorPluginConfig } from "../plugin.js";
import { AnyAccessGuard } from "../server/shared/access/AnyAccessGuard.js";
import { createSyncRunner } from "../server/modules/task-runner/sync-runner/index.js";
import { TranslatorConfigError } from "../core/errors/index.js";
import type { TranslationProvider } from "../core/domain/translation-providers/index.js";

const provider: TranslationProvider = { translate: vi.fn().mockResolvedValue({}) };

const collection = (slug: string, localizeStatus: boolean): CollectionConfig => ({
  slug,
  versions: { drafts: { localizeStatus } },
  fields: [{ name: "title", type: "text", localized: true }],
});

type Experiments = Config["experimental"];

const build = (managed: CollectionConfig[], registered: CollectionConfig[], flag: boolean) => {
  const pluginConfig: TranslatorPluginConfig = {
    collections: managed,
    translationProvider: provider,
    runner: createSyncRunner(),
    access: new AnyAccessGuard(),
    modules: [],
    components: [],
  };
  const hostConfig = {
    collections: registered,
    localization: { defaultLocale: "en", locales: ["en", "de"] },
    ...(flag ? { experimental: { localizeStatus: true } satisfies Experiments } : {}),
  } as unknown as Config;

  return translatorPlugin(pluginConfig)(hostConfig);
};

/**
 * A per-locale `_status` is not a world this plugin can serve: the publish gate and the baseline
 * read both compare it as a string, and neither would notice the shape change. The host hears it
 * where the configuration is written, because by the time a document is saved the answer is already
 * wrong and nothing says so.
 */
describe("translatorPlugin — a per-locale publication status is refused where it is configured", () => {
  it("refuses a managed collection that enables it", async () => {
    const posts = collection("posts", true);

    const error = await build([posts], [posts], true).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TranslatorConfigError);
  });

  it("names the collection, the setting and the way out", async () => {
    const posts = collection("posts", true);

    const error = await build([posts], [posts], true).catch((e: Error) => e);
    const message = (error as Error).message;

    expect(message).toContain("posts");
    expect(message).toContain("localizeStatus");
    // The refusal stops the application before it serves, so it owes the reader what to do, not
    // only what is wrong.
    expect(message).toContain("translat");
  });

  it("builds when the collection does not enable it", async () => {
    const posts = collection("posts", false);

    await expect(build([posts], [posts], true)).resolves.toBeTruthy();
  });

  // Payload clears the collection's own flag during sanitize when the experimental one is absent,
  // and a plugin runs before sanitize — so reading the collection alone would refuse a host whose
  // setting Payload is about to turn off.
  it("builds when the collection enables it but the host did not opt into the experiment", async () => {
    const posts = collection("posts", true);

    await expect(build([posts], [posts], false)).resolves.toBeTruthy();
  });

  it("builds when the collection enabling it is not managed by this plugin", async () => {
    const posts = collection("posts", false);
    const notes = collection("notes", true);

    await expect(build([posts], [posts, notes], true)).resolves.toBeTruthy();
  });
});
