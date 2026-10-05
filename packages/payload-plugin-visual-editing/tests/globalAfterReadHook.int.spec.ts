import { vercelStegaDecode } from "@vercel/stega";
import { describe, expect, it, vi } from "vitest";

import { DRAFT_CONTEXT_KEY } from "../src/internal/beforeOperationHook";
import { createGlobalAfterReadHook } from "../src/internal/globalAfterReadHook";

const schemaCache = {
  get: vi.fn((slug: string) => (slug === "siteSettings" ? { title: "text" } : null)),
};

describe("global afterRead", () => {
  it("enriches and encodes in one pass", () => {
    const hook = createGlobalAfterReadHook({ schemaCache, adminBasePath: "/admin" } as any);
    const result = hook({
      doc: { title: "Site" },
      global: { slug: "siteSettings" },
      req: { context: { [DRAFT_CONTEXT_KEY]: true }, payloadAPI: "local" },
    } as any);
    const decoded = vercelStegaDecode<any>((result as any).title);
    expect(decoded).toMatchObject({
      path: "title",
      collectionSlug: "siteSettings",
      kind: "global",
    });
    expect(decoded.docId).toBeUndefined();
  });
});
