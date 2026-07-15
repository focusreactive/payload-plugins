import { describe, it, expect, vi } from "vitest";
import type { CollectionAfterDeleteHook, Payload } from "payload";

import type { ProvenanceStore } from "../../../core/provenance";
import type { ManagedCollectionsConfig } from "./Provenance.shapes";
import { injectProvenanceCleanup, makeProvenanceCleanupHook } from "./ProvenanceCleanup.hook";

const makeStore = () =>
  ({
    upsert: vi.fn().mockResolvedValue(undefined),
    find: vi.fn().mockResolvedValue(null),
    findByDocument: vi.fn().mockResolvedValue([]),
    dismiss: vi.fn().mockResolvedValue(undefined),
    deleteByDocument: vi.fn().mockResolvedValue(undefined),
  }) satisfies ProvenanceStore;

const makePayload = () => ({ logger: { error: vi.fn() } }) as unknown as Payload;

// A minimal afterDelete hook arg — only the fields the cleanup hook reads.
const hookArg = (id: string | number, slug = "posts", payload = makePayload()) =>
  ({ id, collection: { slug }, req: { payload } }) as never;

describe("makeProvenanceCleanupHook", () => {
  it("deletes the document's provenance rows via the store", async () => {
    const store = makeStore();
    const hook = makeProvenanceCleanupHook(() => store, "translator-provenance");
    await hook(hookArg("doc-1", "posts"));
    expect(store.deleteByDocument).toHaveBeenCalledWith("posts", "doc-1");
  });

  it("stringifies a numeric id to match the stored documentId", async () => {
    const store = makeStore();
    const hook = makeProvenanceCleanupHook(() => store, "translator-provenance");
    await hook(hookArg(42, "posts"));
    expect(store.deleteByDocument).toHaveBeenCalledWith("posts", "42");
  });

  it("uses the deleted collection's slug from the hook arg", async () => {
    const store = makeStore();
    const hook = makeProvenanceCleanupHook(() => store, "translator-provenance");
    await hook(hookArg("doc-1", "pages"));
    expect(store.deleteByDocument).toHaveBeenCalledWith("pages", "doc-1");
  });

  it("swallows and logs a cleanup failure — never throws (best-effort)", async () => {
    const store = makeStore();
    store.deleteByDocument = vi.fn().mockRejectedValue(new Error("db down"));
    const payload = makePayload();
    const hook = makeProvenanceCleanupHook(() => store, "translator-provenance");
    await expect(hook(hookArg("doc-1", "posts", payload))).resolves.toBeUndefined();
    expect(payload.logger.error).toHaveBeenCalled();
  });
});

describe("injectProvenanceCleanup", () => {
  // No cast to Config: the narrow ManagedCollectionsConfig accepts a plain literal.
  const config = (slugs: string[]): ManagedCollectionsConfig => ({
    collections: slugs.map((slug) => ({ slug })),
  });

  it("attaches the hook only to managed collections", () => {
    const store = makeStore();
    const cfg = config(["posts", "media"]);
    injectProvenanceCleanup(cfg, new Set(["posts"]), () => store, "translator-provenance");
    const [posts, media] = cfg.collections as Array<Record<string, any>>;
    expect(posts.hooks.afterDelete).toHaveLength(1);
    expect(media.hooks?.afterDelete).toBeUndefined();
  });

  it("appends to a consumer-supplied afterDelete array, preserving existing hooks", () => {
    const store = makeStore();
    const existing = vi.fn() as unknown as CollectionAfterDeleteHook;
    const cfg: ManagedCollectionsConfig = {
      collections: [{ slug: "posts", hooks: { afterDelete: [existing] } }],
    };
    injectProvenanceCleanup(cfg, new Set(["posts"]), () => store, "translator-provenance");
    const posts = cfg.collections?.[0] as Record<string, any>;
    expect(posts.hooks.afterDelete).toHaveLength(2);
    expect(posts.hooks.afterDelete[0]).toBe(existing);
  });

  it("is idempotent per slug — running twice with the same slug does not stack duplicate hooks", () => {
    const store = makeStore();
    const cfg = config(["posts"]);
    injectProvenanceCleanup(cfg, new Set(["posts"]), () => store, "translator-provenance");
    injectProvenanceCleanup(cfg, new Set(["posts"]), () => store, "translator-provenance");
    const posts = cfg.collections?.[0] as Record<string, any>;
    expect(posts.hooks.afterDelete).toHaveLength(1);
  });

  it("attaches a separate hook per slug — two instances with different slugs both clean up", () => {
    const store = makeStore();
    const cfg = config(["posts"]);
    injectProvenanceCleanup(cfg, new Set(["posts"]), () => store, "provenance-a");
    injectProvenanceCleanup(cfg, new Set(["posts"]), () => store, "provenance-b");
    const posts = cfg.collections?.[0] as Record<string, any>;
    expect(posts.hooks.afterDelete).toHaveLength(2);
  });
});
