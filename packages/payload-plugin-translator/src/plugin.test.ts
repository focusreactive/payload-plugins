import { describe, it, expect, vi } from "vitest";
import type { Config } from "payload";

import { translatorPlugin } from "./plugin";
import type { TranslatorPluginConfig } from "./plugin";
import { documentLevel } from "./server/modules/translation-levels";
import { TranslateDocumentExport } from "./client/widgets/translate-document";
import { BulkDocumentTranslationDashboard } from "./client/widgets/bulk-translation-dashboard/ui/BulkTranslationDashboard.export";

// End-to-end behaviour guard for the levels refactor: the default levels must
// reproduce today's wiring (6-route bundle, cache provider, doc popup + bulk
// dashboard on managed collections, runner configured once), and an explicit
// `levels` list must scope the surfaces accordingly.

const makeCollection = () => ({
  slug: "posts",
  fields: [{ name: "title", type: "text", localized: true }],
});
const makeRunner = () => ({
  create: vi.fn(),
  configure: vi.fn().mockReturnValue((c: Config) => c),
});

async function build(overrides: Partial<TranslatorPluginConfig> = {}) {
  const runner = overrides.runner ?? makeRunner();
  const collection = makeCollection();
  const incoming = { collections: [collection] } as unknown as Config;
  const pluginConfig = {
    collections: [collection],
    translationProvider: { translate: vi.fn() },
    runner,
    ...overrides,
  } as unknown as TranslatorPluginConfig;

  const result = await translatorPlugin(pluginConfig)(incoming);
  return {
    result,
    runner: runner as ReturnType<typeof makeRunner>,
    posts: result.collections?.[0] as Record<string, any>,
  };
}

describe("translatorPlugin — default levels (behaviour-preserving)", () => {
  it("registers the 6-route bundle once (document + collection share it)", async () => {
    const { result } = await build();
    expect(result.endpoints).toHaveLength(6); // not 12 — deduped across the two doc levels
    expect(result.endpoints?.map((e) => e.path)).toContain("/translate/enqueue");
  });

  it("does not duplicate endpoints when the same config is run through the plugin twice", async () => {
    const collection = makeCollection();
    const pluginConfig = {
      collections: [collection],
      translationProvider: { translate: vi.fn() },
      runner: makeRunner(),
    } as unknown as TranslatorPluginConfig;

    const once = await translatorPlugin(pluginConfig)({
      collections: [collection],
    } as unknown as Config);
    const twice = await translatorPlugin(pluginConfig)(once);

    // Endpoint seeding dedups against routes already on the config, so a second
    // registration on the same config doesn't double the 6-route bundle.
    expect(twice.endpoints).toHaveLength(6);
  });

  it("adds the cache provider and configures the runner once", async () => {
    const { result, runner } = await build();
    expect(result.admin?.components?.providers).toHaveLength(1);
    expect(runner.configure).toHaveBeenCalledTimes(1);
  });

  it("attaches the doc popup and bulk dashboard to the managed collection (right component on right slot)", async () => {
    const { posts } = await build();
    expect(posts.admin.components.edit.beforeDocumentControls).toHaveLength(1);
    expect(posts.admin.components.edit.beforeDocumentControls[0]).toBeInstanceOf(TranslateDocumentExport);
    expect(posts.admin.components.beforeListTable).toHaveLength(1);
    expect(posts.admin.components.beforeListTable[0]).toBeInstanceOf(BulkDocumentTranslationDashboard);
  });

  it("threads a custom basePath into every endpoint", async () => {
    const { result } = await build({ basePath: "/i18n" });
    expect(result.endpoints?.every((e) => e.path.startsWith("/i18n/"))).toBe(true);
  });
});

describe("translatorPlugin — explicit levels", () => {
  it("documentLevel only → bundle present, doc popup yes, bulk dashboard no", async () => {
    const { result, posts } = await build({ levels: [documentLevel()] });
    expect(result.endpoints).toHaveLength(6);
    expect(posts.admin.components.edit.beforeDocumentControls).toHaveLength(1);
    expect(posts.admin.components.beforeListTable).toBeUndefined();
  });

  it("empty levels → no endpoints/components, but cache provider + runner config still happen", async () => {
    const { result, runner } = await build({ levels: [] });
    expect(result.endpoints ?? []).toHaveLength(0);
    expect(result.collections?.[0] as Record<string, any>).not.toHaveProperty("admin");
    expect(result.admin?.components?.providers).toHaveLength(1);
    expect(runner.configure).toHaveBeenCalledTimes(1);
  });
});
