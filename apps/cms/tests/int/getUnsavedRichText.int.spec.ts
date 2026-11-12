import { beforeEach, describe, expect, it, vi } from "vitest";

import { getUnsavedRichText } from "@/dal/getUnsavedRichText";

const PAGE_FIELDS = vi.hoisted(() => [
  {
    blocks: [{ fields: [{ name: "content", type: "richText" }], slug: "content" }],
    name: "blocks",
    type: "blocks",
  },
]);

const preview = vi.hoisted(() => ({
  auth: vi.fn(async () => ({ user: null })),
  isDraftMode: true,
}));

vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: preview.isDraftMode }),
  headers: async () => new Headers(),
}));

vi.mock("@/dal/payload-client", async () => {
  const { visualEditingPlugin } = await import("@focus-reactive/payload-plugin-visual-editing");
  const { custom } = await visualEditingPlugin({ instantPreview: true })({
    collections: [],
    db: {
      defaultIDType: "number",
      init: () => {
        throw new Error("The test config has no database");
      },
      name: "test",
    },
    secret: "test-secret",
  });
  return {
    getPayloadClient: async () => ({
      auth: preview.auth,
      collections: { page: { config: { fields: PAGE_FIELDS, slug: "page" } } },
      config: { custom, globals: [], localization: { localeCodes: ["en", "es"] } },
      db: { defaultIDType: "number" },
    }),
  };
});

const STATE = { root: { children: [], type: "root" } };
const FIELD = { collectionSlug: "page", docId: "1", key: "blocks.row.content", kind: "collection" };

describe("getUnsavedRichText", () => {
  beforeEach(() => {
    preview.isDraftMode = true;
    preview.auth.mockClear();
  });

  it("gives nothing outside draft mode, without signing anyone in", async () => {
    preview.isDraftMode = false;

    expect(await getUnsavedRichText({ field: FIELD, locale: "en", state: STATE })).toBeNull();
    expect(preview.auth).not.toHaveBeenCalled();
  });

  it.each([
    ["nothing", undefined],
    ["null", null],
    ["no arguments", []],
    ["an empty object", {}],
    ["a field that is null", { field: null, state: STATE }],
    ["no state", { field: FIELD, locale: "en" }],
  ])(
    "gives nothing for a request that is %s, without signing anyone in",
    async (_name, request) => {
      expect(await getUnsavedRichText(request)).toBeNull();
      expect(preview.auth).not.toHaveBeenCalled();
    }
  );

  it("gives nothing to a request without a signed-in user", async () => {
    expect(await getUnsavedRichText({ field: FIELD, locale: "en", state: STATE })).toBeNull();
    expect(preview.auth).toHaveBeenCalledTimes(1);
  });
});
