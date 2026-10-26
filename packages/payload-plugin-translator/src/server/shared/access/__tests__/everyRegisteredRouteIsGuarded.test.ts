/*
 * Deliberately overlaps `everyRouteNamesItsAction`: that one reads a hand-written table of route
 * factories, so a route nobody added to the table is invisible to it. This boots the plugin instead.
 */
import { describe, it, expect, vi } from "vitest";
import type { CollectionConfig, Config, Endpoint, PayloadRequest } from "payload";

import { translatorPlugin } from "../../../../plugin.js";
import type { TranslatorPluginConfig } from "../../../../plugin.js";
import { createSyncRunner } from "../../../modules/task-runner/sync-runner/index.js";
import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";
import type { AccessGuard } from "../types.js";
import { documentTranslation, fieldTranslation } from "../../../../composition/modules/index.js";

const provider: TranslationProvider = { translate: vi.fn().mockResolvedValue({}) };

const posts: CollectionConfig = {
  slug: "posts",
  fields: [{ name: "title", type: "text", localized: true }],
};

const refusing = { check: vi.fn().mockReturnValue(false) };

const registeredRoutes = async (access: AccessGuard = refusing): Promise<Endpoint[]> => {
  const options: TranslatorPluginConfig = {
    collections: [posts],
    translationProvider: provider,
    runner: createSyncRunner(),
    access,
    provenance: true,
    modules: [documentTranslation(), fieldTranslation()],
    components: [],
  };

  const config = await translatorPlugin(options)({
    collections: [posts],
    localization: { defaultLocale: "en", locales: ["en", "de"] },
  } as unknown as Config);

  return (config.endpoints ?? []) as Endpoint[];
};

const anonymously = async (endpoint: Endpoint): Promise<Response> =>
  await endpoint.handler({
    headers: new Headers(),
    user: null,
    payload: {},
  } as unknown as PayloadRequest);

describe("every route the plugin registers is behind the guard", () => {
  it("registers the routes composed in all three places", async () => {
    const paths = (await registeredRoutes()).map((e) => e.path).sort();

    expect(paths).toEqual([
      "/translate/cancel",
      "/translate/cancel-by-collection/:collection_slug",
      "/translate/collection/:collection_slug",
      "/translate/document/:collection_slug/:collection_id",
      "/translate/enqueue",
      "/translate/field",
      "/translate/run/:id",
      "/translate/stale/:collection_slug/:collection_id",
      "/translate/stale/dismiss",
    ]);
  });

  it("refuses every one of them when the guard says no", async () => {
    const routes = await registeredRoutes();

    const statuses = await Promise.all(
      routes.map(
        async (endpoint) =>
          `${endpoint.method} ${endpoint.path}: ${(await anonymously(endpoint)).status}`
      )
    );

    expect(statuses.filter((s) => !s.endsWith(": 403"))).toEqual([]);
  });
});

/*
 * The guard is asked outside the error handler, never inside it. `askTheGuard` re-throws a framework
 * navigation signal on purpose; wrapped the other way round the error handler catches it and answers
 * 500, so the redirect a host asked for never happens. Nine route files hold that order by hand.
 */
describe("a navigation a guard asks for is not swallowed", () => {
  const navigating = Object.assign(new Error("NEXT_REDIRECT"), {
    digest: "NEXT_REDIRECT;push;/login;307;",
  });
  const navigatingGuard: AccessGuard = {
    check: () => {
      throw navigating;
    },
  };

  it("reaches the framework from every registered route", async () => {
    const routes = await registeredRoutes(navigatingGuard);

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
