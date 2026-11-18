import { vi } from "vitest";
import type { Endpoint, PayloadRequest } from "payload";

import { translationStub } from "../../../../composition/modules/translationStub.js";
import { translationLanguages } from "../../../../server/features/_lib/index.js";
import { storeDouble } from "../../../../server/modules/runs/__tests__/fixtures/runRecordStore.js";
import { resolveSettings } from "../../../../settings.js";
import type { AccessGuard } from "../../../../types/AccessGuard.js";
import type { ApiBase } from "../../../shared/api/createRequest.js";
import type { DocumentAddress } from "../model/TranslationRepository.js";
import type { ContractLocales } from "./TranslationRepository.contract.js";

const API_ROUTE = "/api";

export type InProcessServer = {
  /** The stub's documents; every other id reads as absent. */
  documents: readonly DocumentAddress[];
  locales: ContractLocales;
  access: AccessGuard;
};

export type InProcessFetch = { fetch: typeof globalThis.fetch; baseURL: ApiBase };

const keyOf = ({ collection, id }: DocumentAddress): string => `${collection}:${id}`;

/** The stub's contributions, collected as the plugin's builder receives them. */
function stubRoutes(collections: readonly string[], access: AccessGuard): Endpoint[] {
  const endpoints: Endpoint[] = [];
  translationStub({ scenario: "empty" }).setup?.({
    collections: collections.map((slug) => ({ slug, fields: [] })),
    settings: resolveSettings({}),
    access,
    taskRunnerFactory: { create: vi.fn(), capabilities: { stop: true, run: true } },
    runRecordStoreFactory: () => storeDouble(),
    schemaMap: new Map(),
    translationProvider: { translate: vi.fn() },
    walk: translationLanguages(),
    addEndpoints: (added) => endpoints.push(...added),
    addConfigModifier: () => undefined,
  });
  return endpoints;
}

/** Path params when `pattern` (with `:name` segments) matches `path`, else `null`. */
function match(pattern: string, path: string): Record<string, string> | null {
  const expected = pattern.split("/");
  const actual = path.split("/");
  if (expected.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (const [index, segment] of expected.entries()) {
    const value = actual[index] ?? "";
    if (segment.startsWith(":")) params[segment.slice(1)] = decodeURIComponent(value);
    else if (segment !== value) return null;
  }
  return params;
}

const textOf = (body: RequestInit["body"]): string => (typeof body === "string" ? body : "");

/**
 * A `fetch` that dispatches to the stub's real handlers, guard and error handler included, as
 * Payload would: route params, search params, `json()`, a user, the host's locales.
 */
export function inProcessFetch({ documents, locales, access }: InProcessServer): InProcessFetch {
  const held = new Set(documents.map(keyOf));
  const routes = stubRoutes([...new Set(documents.map(({ collection }) => collection))], access);
  const payload = {
    config: {
      localization: {
        defaultLocale: locales.source,
        locales: [locales.source, ...locales.targets],
      },
    },
    findByID: async ({ collection, id }: { collection: string; id: string }) =>
      held.has(keyOf({ collection, id })) ? { id, title: "Hello" } : null,
  };

  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(input instanceof Request ? input.url : input, "http://in-process");
    const path = url.pathname.slice(API_ROUTE.length);
    const method = (init.method ?? "GET").toLowerCase();
    for (const endpoint of routes) {
      const params = endpoint.method === method ? match(endpoint.path, path) : null;
      if (!params) continue;
      const body = textOf(init.body);
      const req = {
        routeParams: params,
        searchParams: url.searchParams,
        query: Object.fromEntries(url.searchParams),
        json: async () => (body === "" ? undefined : JSON.parse(body)),
        headers: new Headers(init.headers),
        user: { id: 1 },
        payload,
      } as unknown as PayloadRequest;
      return endpoint.handler(req);
    }
    return Response.json({ message: `No route for ${method} ${path}` }, { status: 404 });
  };

  return { fetch, baseURL: `${API_ROUTE}${resolveSettings({}).basePath}` };
}
