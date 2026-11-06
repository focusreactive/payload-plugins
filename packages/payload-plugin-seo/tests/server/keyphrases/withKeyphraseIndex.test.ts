import type { CollectionAfterDeleteHook, CollectionConfig, Config } from "payload";
import { describe, expect, it, vi } from "vitest";
import { KEYPHRASES_COLLECTION_SLUG } from "../../../src/constants";
import { withKeyphraseIndex } from "../../../src/server/keyphrases/withKeyphraseIndex";

const incoming = {
  collections: [
    { slug: "posts", fields: [] },
    { slug: "media", fields: [] },
  ],
  endpoints: [],
} as unknown as Config;

const pluginConfig = { collections: [{ slug: "posts", extractContentPath: "@/x#default" }] };

function findCollection(config: Config, slug: string): CollectionConfig | undefined {
  return config.collections?.find((c) => c.slug === slug);
}

const enabled = () => withKeyphraseIndex(incoming, { ...pluginConfig, keyphraseIndex: true });

describe("withKeyphraseIndex", () => {
  it("changes nothing when the option is off", () => {
    expect(withKeyphraseIndex(incoming, pluginConfig)).toBe(incoming);
  });

  it("adds the collection, endpoints and an afterDelete hook on indexed collections", () => {
    const result = enabled();

    expect(findCollection(result, KEYPHRASES_COLLECTION_SLUG)).toBeDefined();
    expect(result.endpoints?.map((e) => e.path)).toEqual(
      expect.arrayContaining(["/seo/keyphrases", "/seo/keyphrase-usage", "/seo/link-suggestions"])
    );
    expect(findCollection(result, "posts")?.hooks?.afterDelete).toHaveLength(1);
    expect(findCollection(result, "media")?.hooks?.afterDelete).toBeUndefined();
  });

  it("the hook deletes the document's rows in every locale", async () => {
    const hook = findCollection(enabled(), "posts")?.hooks?.afterDelete?.[0];
    const del = vi.fn(async () => ({ docs: [] }));
    const req = { payload: { delete: del } };

    await hook?.({ id: 12, req } as unknown as Parameters<CollectionAfterDeleteHook>[0]);

    expect(del).toHaveBeenCalledWith({
      collection: KEYPHRASES_COLLECTION_SLUG,
      where: { and: [{ docCollection: { equals: "posts" } }, { docId: { equals: "12" } }] },
      overrideAccess: true,
      req,
    });
  });
});
