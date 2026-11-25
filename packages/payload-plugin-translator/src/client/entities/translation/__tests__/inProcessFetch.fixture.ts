import type { Endpoint, PayloadRequest } from "payload";

import { resolveSettings } from "../../../../settings.js";
import type { AccessGuard } from "../../../../types/AccessGuard.js";
import { createStubRoutes } from "./stub-world/http/index.js";
import { StubWorld } from "./stub-world/model/index.js";
import { SCENARIOS } from "./stub-world/scenarios/index.js";
import type { ApiBase } from "../../../shared/api/createRequest.js";
import type { DocumentAddress } from "../model/TranslationRepository.js";
import type { ContractLocales } from "./TranslationRepository.contract.js";

const API_ROUTE = "/api";

export type InProcessServer = {
  documents: readonly DocumentAddress[];
  locales: ContractLocales;
  access: AccessGuard;
};

export type InProcessFetch = { fetch: typeof globalThis.fetch; baseURL: ApiBase };

const keyOf = ({ collection, id }: DocumentAddress): string => `${collection}:${id}`;

const SCENARIO = SCENARIOS.empty;

function stubRoutes(collections: readonly string[], access: AccessGuard): Endpoint[] {
  return createStubRoutes({
    world: new StubWorld(SCENARIO),
    managed: new Set(collections),
    access,
    basePath: resolveSettings({}).basePath,
    latencyMs: SCENARIO.latencyMs,
    servesCancelAndRunNow: SCENARIO.servesCancelAndRunNow,
  });
}

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

export function inProcessFetch({ documents, locales, access }: InProcessServer): InProcessFetch {
  const held = new Set(documents.map(keyOf));
  const routes = stubRoutes([...new Set(documents.map(({ collection }) => collection))], access);
  const payload = {
    collections: {},
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
