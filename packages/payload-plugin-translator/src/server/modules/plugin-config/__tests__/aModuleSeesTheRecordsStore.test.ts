import { describe, it, expect, vi } from "vitest";
import type { CollectionConfig, Config } from "payload";

import { translatorPlugin } from "../../../../plugin.js";
import type { TranslatorPluginConfig } from "../../../../plugin.js";
import { AnyAccessGuard } from "../../../shared/access/AnyAccessGuard.js";
import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";
import type { ModuleContext, TranslationModule } from "../index.js";

const posts: CollectionConfig = {
  slug: "posts",
  fields: [{ name: "title", type: "text", localized: true }],
};

const provider: TranslationProvider = { translate: vi.fn().mockResolvedValue({}) };

const runner = {
  capabilities: { stop: true, run: true },
  create: () => ({
    enqueue: async () => [],
    stop: async (): Promise<void> => undefined,
    run: async () => ({ success: false, error: "not_found" }) as const,
  }),
  configure: () => (config: Config) => config,
};

const seeing = (seen: { context?: ModuleContext }): TranslationModule => ({
  name: "a-watcher",
  setup(ctx) {
    seen.context = ctx;
  },
});

const boot = async (over: Partial<TranslatorPluginConfig>) => {
  const seen: { context?: ModuleContext } = {};
  await translatorPlugin({
    collections: [posts],
    translationProvider: provider,
    access: new AnyAccessGuard(),
    runner,
    modules: [seeing(seen)],
    components: [],
    ...over,
  })({
    collections: [posts],
    localization: { defaultLocale: "en", locales: ["en", "de"] },
  } as unknown as Config);
  return seen.context;
};

describe("what a module is handed about past runs", () => {
  it("is handed the records where the installation keeps them", async () => {
    const context = await boot({ provenance: true });

    expect(typeof context?.provenance?.storeFactory).toBe("function");
    expect(typeof context?.provenance?.stalenessFactory).toBe("function");
  });

  it("is handed nothing where it keeps none, so the answer carries no verdicts", async () => {
    expect((await boot({ provenance: false }))?.provenance).toBeUndefined();
  });
});
