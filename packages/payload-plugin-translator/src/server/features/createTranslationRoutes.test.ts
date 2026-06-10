import { describe, it, expect, vi } from "vitest";

import { createTranslationRoutes } from "./createTranslationRoutes";
import type { TranslationRoutesDeps } from "./createTranslationRoutes";

// Bundle-contract test: pins that the shared route bundle stays complete and
// ordered, and threads basePath into every endpoint. Phase 1 will register this
// bundle conditionally, so "all 6, right paths/methods" must not drift. Each
// route's own wiring is pinned by its sibling route.test.ts.
const deps = (basePath?: string): TranslationRoutesDeps => ({
  taskRunnerFactory: { create: vi.fn() },
  collectionConfig: { availableCollections: new Set() },
  basePath,
});

describe("createTranslationRoutes (bundle contract)", () => {
  it("registers all 6 job-API endpoints with the expected method + path", () => {
    const routes = createTranslationRoutes(deps("/translate"));

    expect(routes.map((r) => `${r.method} ${r.path}`)).toEqual([
      "post /translate/enqueue",
      "post /translate/run/:id",
      "delete /translate/cancel",
      "delete /translate/cancel-by-collection/:collection_slug",
      "get /translate/document/:collection_slug/:collection_id",
      "get /translate/collection/:collection_slug",
    ]);
  });

  it("threads a custom basePath into every endpoint", () => {
    const routes = createTranslationRoutes(deps("/i18n"));

    expect(routes).toHaveLength(6);
    expect(routes.every((r) => r.path.startsWith("/i18n/"))).toBe(true);
  });
});
