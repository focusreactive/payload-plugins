import { vercelStegaDecode } from "@vercel/stega";
import { describe, expect, it } from "vitest";

import { createReadHooks } from "../../src/server/hooks/readHooks";
import { isPlainObject } from "../../src/shared/plainObject";
import { META_KEY } from "../../src/shared/shared";

import { valueAt } from "../support/markedData";

const pagesSchema = {
  body: "richText",
  list: { label: "text" },
  related: "relationship",
  title: "text",
};

const schemaCache = {
  get: (slug: string) => {
    if (slug === "pages") return pagesSchema;
    return slug === "settings" ? { title: "text" } : null;
  },
};

const hooks = createReadHooks({
  adminBasePath: "/admin",
  enrichment: "auto",
  excludeValues: [],
  instantPreview: false,
  schemaCache,
});

type CollectionReadArgs = Parameters<typeof hooks.collectionAfterOperation>[0];

type GlobalOperationArgs = Parameters<typeof hooks.globalBeforeOperation>[0];

type GlobalReadArgs = Parameters<typeof hooks.globalAfterRead>[0];

const request = (context = {}) => ({ context, payloadAPI: "local" });

const afterOperation = (
  operation: string,
  draft: boolean,
  result: unknown,
  context = {}
): unknown =>
  hooks.collectionAfterOperation({
    args: { draft },
    collection: { slug: "pages" },
    operation,
    req: request(context),
    result,
  } as unknown as CollectionReadArgs);

const markerAt = (data: unknown, dataPath: string) =>
  vercelStegaDecode(String(valueAt(data, dataPath)));

const fieldReferenceOf = (value: unknown) => (isPlainObject(value) ? value[META_KEY] : undefined);

const fieldReferenceAt = (data: unknown, dataPath: string) =>
  fieldReferenceOf(valueAt(data, dataPath));

const versionOf = (parent: unknown) => ({
  id: "v-1",
  parent,
  version: {
    body: { root: { children: [], type: "root" } },
    list: [{ id: "row-1", label: "First" }],
    related: { id: "p-2", title: "Other" },
    title: "Hi",
  },
});

describe("collection afterOperation", () => {
  it("marks the document of a draft findByID with its path and identity", () => {
    const result = afterOperation("findByID", true, { id: "p-1", title: "Hi" });

    expect(markerAt(result, "title")).toEqual({
      collectionSlug: "pages",
      docId: "p-1",
      kind: "collection",
      path: "title",
    });
    expect(fieldReferenceOf(result)).toBeUndefined();
  });

  it("marks every document of a draft find", () => {
    const result = afterOperation("find", true, {
      docs: [{ id: "p-1", title: "Hi" }],
      totalDocs: 1,
    });

    expect(markerAt(result, "docs.0.title")).toMatchObject({ path: "title" });
  });

  it.each([
    ["findVersions", "p-1", "docs.0.version"],
    ["findVersionByID", { id: "p-1", title: "Hi" }, "version"],
  ])(
    "marks the version of %s that asks for markers as a document of its parent",
    (operation, parent, versionPath) => {
      const read = versionOf(parent);
      const result = afterOperation(
        operation,
        false,
        operation === "findVersions" ? { docs: [read] } : read,
        { visualEditing: true }
      );
      const at = (fieldPath: string) => `${versionPath}.${fieldPath}`;
      const inPage = { collectionSlug: "pages", docId: "p-1", kind: "collection" };

      expect(markerAt(result, at("title"))).toEqual({ ...inPage, path: "title" });
      expect(markerAt(result, at("list.0.label"))).toEqual({
        ...inPage,
        path: "list.0.label",
      });
      expect(fieldReferenceAt(result, at("body"))).toEqual({
        ...inPage,
        path: "body",
        terminal: true,
      });
      expect(fieldReferenceAt(result, at("related"))).toEqual({
        ...inPage,
        path: "related",
        terminal: true,
      });
    }
  );

  it("marks nothing in a read of versions that does not ask for markers", () => {
    const read = { docs: [{ id: "v-1", version: { id: "p-1", list: [{ id: "r", label: "A" }] } }] };

    expect(afterOperation("findVersions", true, structuredClone(read))).toEqual(read);
  });
});

describe("global hooks", () => {
  const global = { slug: "settings" };

  it("mark a draft read of a global, which has no document id", () => {
    const req = request();
    hooks.globalBeforeOperation({
      args: { draft: true },
      global,
      operation: "read",
      req,
    } as unknown as GlobalOperationArgs);
    const result: unknown = hooks.globalAfterRead({
      doc: { title: "Site" },
      global,
      req,
    } as unknown as GlobalReadArgs);

    expect(markerAt(result, "title")).toEqual({
      collectionSlug: "settings",
      kind: "global",
      path: "title",
    });
  });
});
