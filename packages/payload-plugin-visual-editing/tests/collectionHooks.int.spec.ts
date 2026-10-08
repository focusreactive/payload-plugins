import { vercelStegaDecode } from "@vercel/stega";
import { describe, expect, it, vi } from "vitest";

import { createAfterOperationHook } from "../src/internal/afterOperationHook";
import { createAfterReadHook } from "../src/internal/afterReadHook";
import { DRAFT_CONTEXT_KEY } from "../src/internal/beforeOperationHook";
import { META_KEY } from "../src/internal/shared";

const schemaCache = {
  get: vi.fn((slug: string) => {
    if (slug === "pages") return { title: "text" };
    return null;
  }),
};

const makeReq = (draft: boolean) =>
  ({
    context: { [DRAFT_CONTEXT_KEY]: draft },
    payloadAPI: "local",
  }) as any;

describe("collection afterRead + afterOperation", () => {
  it("afterRead enriches with _meta and does not encode", () => {
    const hook = createAfterReadHook("/admin");
    const result = hook({
      doc: { id: "p-1", title: "Hi" },
      collection: { slug: "pages" },
      req: makeReq(true),
    } as any);
    expect((result as any)[META_KEY]).toMatchObject({
      docId: "p-1",
      collectionSlug: "pages",
      kind: "collection",
    });
    expect((result as any).title).toBe("Hi"); // no stega yet
  });

  it("afterRead skips when gate is closed", () => {
    const hook = createAfterReadHook("/admin");
    const result = hook({
      doc: { id: "p-1", title: "Hi" },
      collection: { slug: "pages" },
      req: makeReq(false),
    } as any);
    expect((result as any)[META_KEY]).toBeUndefined();
  });

  it("afterOperation encodes stega over the whole tree", () => {
    const hook = createAfterOperationHook({ schemaCache, adminBasePath: "/admin" } as any);
    const doc = {
      id: "p-1",
      title: "Hi",
      [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
    };
    const result = hook({
      operation: "findByID",
      result: doc,
      req: makeReq(true),
    } as any);
    const decoded = vercelStegaDecode<any>((result as any).title);
    expect(decoded).toMatchObject({ path: "title", docId: "p-1" });
  });

  it("afterOperation handles find result shape (docs array)", () => {
    const hook = createAfterOperationHook({ schemaCache, adminBasePath: "/admin" } as any);
    const result = hook({
      operation: "find",
      result: {
        docs: [
          {
            id: "p-1",
            title: "Hi",
            [META_KEY]: { path: "", docId: "p-1", collectionSlug: "pages", kind: "collection" },
          },
        ],
        totalDocs: 1,
      },
      req: makeReq(true),
    } as any);
    const decoded = vercelStegaDecode<any>((result as any).docs[0].title);
    expect(decoded).toMatchObject({ path: "title" });
  });
});
