/*
 * Boots the plugin, as `everyRegisteredRouteIsGuarded.test.ts` does: the admin's config is read
 * off what the real modules registered, so only a real boot can show the two agree.
 */
import { describe, it, expect, vi } from "vitest";
import type { CollectionConfig, Config, Endpoint } from "payload";

import { translatorPlugin } from "../../../../plugin.js";
import type { TranslatorPluginConfig } from "../../../../plugin.js";
import { withAutoTranslate } from "../../../../auto-translate-config.js";
import { CacheProviderExport } from "../../../../client/app/cache/CacheProvider.export.js";
import { createSyncRunner } from "../../task-runner/sync-runner/index.js";
import type { TaskRunnerProvider } from "../../task-runner/index.js";
import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";
import { AnyAccessGuard } from "../../../shared/access/AnyAccessGuard.js";
import { documentTranslation, fieldTranslation } from "../../../../composition/modules/index.js";
import { ENDPOINTS } from "../../../../types/wire/endpoints.js";
import type { EndpointName } from "../../../../types/wire/endpoints.js";
import type { TranslateKitConfig } from "../../../../types/wire/TranslateKitConfig.js";
import type { TranslationModule } from "../index.js";
import { DuplicateEndpointError } from "../errors/DuplicateEndpointError.js";

const provider: TranslationProvider = { translate: vi.fn().mockResolvedValue({}) };

const posts: CollectionConfig = {
  slug: "posts",
  fields: [{ name: "title", type: "text", localized: true }],
};

const canDoEverything: TaskRunnerProvider = {
  capabilities: { stop: true, run: true },
  create: () => ({
    enqueue: async () => [],
    stop: async (): Promise<void> => undefined,
    run: async () => ({ success: false, error: "not_found" }) as const,
  }),
  configure: () => (config) => config,
};

const boot = async (options: Partial<TranslatorPluginConfig> = {}, host: Partial<Config> = {}) => {
  const collections = options.collections ?? [posts];
  return await translatorPlugin({
    collections,
    translationProvider: provider,
    runner: canDoEverything,
    access: new AnyAccessGuard(),
    provenance: true,
    modules: [documentTranslation(), fieldTranslation()],
    components: [],
    ...options,
  })({
    collections,
    localization: { defaultLocale: "en", locales: ["en", "de", "fr"] },
    ...host,
  } as unknown as Config);
};

const adminConfigOf = (config: Config): TranslateKitConfig => {
  const exports = (config.admin?.components?.providers ?? []).filter(
    (entry): entry is CacheProviderExport => entry instanceof CacheProviderExport
  );
  expect(exports).toHaveLength(1);
  return exports[0].clientProps;
};

const ACTIONS = [
  "enqueue",
  "cancel",
  "runNow",
  "dismissStaleness",
  "translateField",
] as const satisfies readonly EndpointName[];

describe("the endpoint table names the routes the real modules register", () => {
  it.each(ACTIONS)("%s", async (name) => {
    const registered = ((await boot()).endpoints ?? []).map(
      (endpoint: Endpoint) => `${endpoint.method} ${endpoint.path}`
    );

    expect(registered).toContain(`${ENDPOINTS[name].method} /translate${ENDPOINTS[name].path}`);
  });
});

describe("the admin is told what this installation can do", () => {
  it("can do everything with both modules and provenance on a runner that can stop and run", async () => {
    expect(adminConfigOf(await boot()).abilities).toEqual({
      translate: true,
      cancel: true,
      runNow: true,
      staleness: true,
      translateField: true,
    });
  });

  it("cannot cancel or run now on a runner that only accepts work", async () => {
    expect(adminConfigOf(await boot({ runner: createSyncRunner() })).abilities).toEqual({
      translate: true,
      cancel: false,
      runNow: false,
      staleness: true,
      translateField: true,
    });
  });

  it("names every flag, false for what nothing registered", async () => {
    expect(adminConfigOf(await boot({ modules: [], provenance: false })).abilities).toEqual({
      translate: false,
      cancel: false,
      runNow: false,
      staleness: false,
      translateField: false,
    });
  });

  it("carries the base path the routes were registered under", async () => {
    const config = adminConfigOf(await boot({ basePath: "/i18n" }));

    expect(config.basePath).toBe("/i18n");
    expect(config.abilities.translate).toBe(true);
  });
});

describe("the admin is told each managed collection's auto-translate targets", () => {
  const pages: CollectionConfig = { slug: "pages", fields: posts.fields };

  it("lists the targets without the source and without a locale the project does not have", async () => {
    const config = await boot({
      collections: [withAutoTranslate(posts, { targets: ["en", "de", "de", "xx"] }), pages],
    });

    expect(adminConfigOf(config).collections).toEqual({
      posts: { autoTranslateTargets: ["de"] },
      pages: { autoTranslateTargets: [] },
    });
  });

  it("leaves out a collection the plugin does not manage", async () => {
    const unmanaged: CollectionConfig = { slug: "users", fields: [] };
    const config = await boot({}, { collections: [posts, unmanaged] });

    expect(Object.keys(adminConfigOf(config).collections)).toEqual(["posts"]);
  });
});

describe("two of the plugin's own contributions cannot claim one route", () => {
  const claiming = (name: string, method: Endpoint["method"], path: string): TranslationModule => ({
    name,
    setup(ctx) {
      ctx.addEndpoints([{ method, path, handler: vi.fn() }]);
    },
  });

  it("refuses a module that claims a route another module registered", async () => {
    await expect(
      boot({ modules: [documentTranslation(), claiming("impostor", "post", "/translate/enqueue")] })
    ).rejects.toThrow(DuplicateEndpointError);
  });

  it("refuses a module that claims the route provenance registered", async () => {
    await expect(
      boot({ modules: [claiming("impostor", "post", "/translate/stale/dismiss")] })
    ).rejects.toThrow(DuplicateEndpointError);
  });

  it("leaves a route the host already has to the host", async () => {
    const own: Endpoint = { method: "post", path: "/translate/enqueue", handler: vi.fn() };

    const config = await boot({}, { endpoints: [own] });

    const enqueues = (config.endpoints ?? []).filter(
      (endpoint) => endpoint.method === "post" && endpoint.path === "/translate/enqueue"
    );
    expect(enqueues).toEqual([own]);
  });
});
