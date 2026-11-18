/*
 * The stub's variant of `everyRegisteredRouteIsGuarded`: it boots the plugin with the stub module in
 * place of the real ones, so a stub route that slipped past the guard would show here.
 */
import { describe, it, expect, vi } from "vitest";
import type { CollectionConfig, Config, Endpoint, PayloadRequest } from "payload";

import { translatorPlugin } from "../../../../plugin.js";
import type { TranslatorPluginConfig } from "../../../../plugin.js";
import { CacheProviderExport } from "../../../../client/app/cache/CacheProvider.export.js";
import type { TaskRunnerProvider } from "../../../modules/task-runner/index.js";
import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";
import type { AccessGuard } from "../types.js";
import { documentTranslation } from "../../../../composition/modules/index.js";
import { translationStub } from "../../../../composition/modules/translationStub.js";
import { DuplicateEndpointError } from "../../../modules/plugin-config/errors/DuplicateEndpointError.js";

const provider: TranslationProvider = { translate: vi.fn().mockResolvedValue({}) };

const posts: CollectionConfig = {
  slug: "posts",
  fields: [{ name: "title", type: "text", localized: true }],
};

const refusing = { check: vi.fn().mockReturnValue(false) };

const canDoEverything: TaskRunnerProvider = {
  capabilities: { stop: true, run: true },
  create: () => ({
    enqueue: async () => [],
    stop: async (): Promise<void> => undefined,
    run: async () => ({ success: false, error: "not_found" }) as const,
  }),
  configure: () => (config) => config,
};

const boot = async (options: Partial<TranslatorPluginConfig> = {}): Promise<Config> =>
  await translatorPlugin({
    collections: [posts],
    translationProvider: provider,
    runner: canDoEverything,
    access: refusing,
    provenance: false,
    modules: [translationStub()],
    components: [],
    ...options,
  })({
    collections: [posts],
    localization: { defaultLocale: "en", locales: ["en", "de"] },
  } as unknown as Config);

const routesOf = async (access: AccessGuard = refusing): Promise<Endpoint[]> =>
  ((await boot({ access })).endpoints ?? []) as Endpoint[];

const anonymously = async (endpoint: Endpoint): Promise<Response> =>
  await endpoint.handler({
    headers: new Headers(),
    user: null,
    payload: {},
  } as unknown as PayloadRequest);

describe("every route the stub registers is behind the guard", () => {
  it("registers the two reads and every action route", async () => {
    const paths = (await routesOf()).map((e) => `${e.method} ${e.path}`).sort();

    expect(paths).toEqual([
      "delete /translate/cancel",
      "get /translate/document-state/:collection_slug/:collection_id",
      "get /translate/list-state/:collection_slug",
      "post /translate/enqueue",
      "post /translate/field",
      "post /translate/run/:collection_slug/:collection_id",
      "post /translate/stale/dismiss",
    ]);
  });

  it("refuses every one of them when the guard says no", async () => {
    const statuses = await Promise.all(
      (await routesOf()).map(
        async (endpoint) =>
          `${endpoint.method} ${endpoint.path}: ${(await anonymously(endpoint)).status}`
      )
    );

    expect(statuses.filter((s) => !s.endsWith(": 403"))).toEqual([]);
  });

  it("lets a navigation the guard asks for reach the framework", async () => {
    const navigating = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;push;/login;307;",
    });
    const routes = await routesOf({
      check: () => {
        throw navigating;
      },
    });

    const swallowed = [];
    for (const endpoint of routes) {
      const outcome = await anonymously(endpoint).then(
        (response) => `${endpoint.method} ${endpoint.path}: answered ${response.status}`,
        () => null
      );
      if (outcome !== null) swallowed.push(outcome);
    }

    expect(swallowed).toEqual([]);
  });
});

describe("the stub never runs beside the real modules", () => {
  it("is refused beside documentTranslation()", async () => {
    await expect(boot({ modules: [translationStub(), documentTranslation()] })).rejects.toThrow(
      DuplicateEndpointError
    );
  });

  it("is refused with provenance on, which serves the same dismiss route", async () => {
    await expect(boot({ provenance: true })).rejects.toThrow(DuplicateEndpointError);
  });
});

describe("the admin is told what the stub serves", () => {
  const abilitiesOf = (config: Config) => {
    const [cacheProvider] = (config.admin?.components?.providers ?? []).filter(
      (entry): entry is CacheProviderExport => entry instanceof CacheProviderExport
    );
    return cacheProvider?.clientProps.abilities;
  };

  it("can do everything in the mixed scenario", async () => {
    expect(abilitiesOf(await boot())).toEqual({
      translate: true,
      cancel: true,
      runNow: true,
      staleness: true,
      translateField: true,
    });
  });

  it("cannot cancel or run now when abilities are limited", async () => {
    expect(
      abilitiesOf(await boot({ modules: [translationStub({ scenario: "abilities-limited" })] }))
    ).toEqual({
      translate: true,
      cancel: false,
      runNow: false,
      staleness: true,
      translateField: true,
    });
  });
});
