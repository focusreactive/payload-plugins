import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { AccessGuard } from "../../../types/AccessGuard.js";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

// Both client components import `@payloadcms/ui`, whose CSS the node environment cannot load.
vi.mock("../translate-document/ui/TranslateDocument.js", () => ({ default: () => null }));
vi.mock("../bulk-translation-dashboard/ui/BulkTranslationDashboard.js", () => ({
  default: () => null,
}));

const TranslateDocumentServer = (
  await import("../translate-document/ui/TranslateDocument.server.js")
).default;
const BulkTranslationDashboardServer = (
  await import("../bulk-translation-dashboard/ui/BulkTranslationDashboard.server.js")
).default;

type DocumentProps = Parameters<typeof TranslateDocumentServer>[0];
type DashboardProps = Parameters<typeof BulkTranslationDashboardServer>[0];

const answering = (answer: unknown): AccessGuard =>
  ({ check: vi.fn().mockResolvedValue(answer) }) as unknown as AccessGuard;

const exploding = (): AccessGuard =>
  ({ check: vi.fn().mockRejectedValue(new Error("guard exploded")) }) as unknown as AccessGuard;

const payload = {
  config: { localization: false },
  collections: { posts: { config: { slug: "posts", fields: [] } } },
};

const documentProps = (access: AccessGuard): DocumentProps =>
  ({
    access,
    id: "d1",
    user: { id: "u1" },
    payload,
    collection: { slug: "posts", fields: [] },
    targetSelection: "single",
  }) as unknown as DocumentProps;

const dashboardProps = (access: AccessGuard): DashboardProps =>
  ({
    access,
    collectionSlug: "posts",
    user: { id: "u1" },
    payload,
    targetSelection: "single",
  }) as unknown as DashboardProps;

const widgets = [
  ["the per-document panel", (a: AccessGuard) => TranslateDocumentServer(documentProps(a))],
  ["the bulk dashboard", (a: AccessGuard) => BulkTranslationDashboardServer(dashboardProps(a))],
] as const;

describe("the admin widgets ask the guard the way every other entry point does", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(widgets)("%s names the action it offers", async (_name, render) => {
    const guard = answering(true);

    await render(guard);

    expect(guard.check).toHaveBeenCalledWith(expect.objectContaining({ action: "enqueue" }));
  });

  it.each(widgets)("%s renders something when allowed", async (_name, render) => {
    expect(await render(answering(true))).not.toBeNull();
  });

  it.each(widgets)("%s renders nothing when refused", async (_name, render) => {
    expect(await render(answering(false))).toBeNull();
  });

  it.each(widgets)(
    "%s renders nothing for a truthy answer that is not true",
    async (_name, render) => {
      expect(await render(answering("yes"))).toBeNull();
    }
  );

  it.each(widgets)(
    "%s renders nothing when the guard throws, rather than failing the page",
    async (_name, render) => {
      expect(await render(exploding())).toBeNull();
    }
  );
});
