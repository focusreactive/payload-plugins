import type { Field, FormState } from "payload";

import { describe, expect, it, vi } from "vitest";

import {
  fetchPickedMedia,
  mediaPickOf,
  pickOfDocument,
} from "../../src/admin/inlineEditing/mediaPick";
import { buildEditableSchema } from "../../src/shared/editableSchema/editableSchema";
import { shownMediaOf } from "../../src/shared/mediaOption";
import { VE_PICK_MEDIA_TYPE } from "../../src/shared/protocol";

const editableSchema = buildEditableSchema([
  { name: "title", type: "text" },
  { name: "image", type: "upload", relationTo: "media" },
  { name: "gallery", type: "upload", relationTo: "media", hasMany: true },
  { name: "eitherFile", type: "upload", relationTo: ["media", "documents"] },
  { name: "cover", type: "upload", relationTo: "media", hidden: true },
  {
    name: "layout",
    type: "blocks",
    blocks: [{ slug: "hero", fields: [{ name: "image", type: "upload", relationTo: "media" }] }],
  },
] as Field[]);

const formState = {
  cover: { value: 3 },
  eitherFile: { value: { relationTo: "media", value: 3 } },
  gallery: { value: [3] },
  image: { value: 3 },
  layout: {
    rows: [
      { blockType: "hero", id: "row-a" },
      { blockType: "hero", id: "row-b" },
    ],
  },
  "layout.0.image": { value: 3 },
  "layout.1.image": { value: null },
  title: { value: "Title" },
} as unknown as FormState;

const PAGE = { collectionSlug: "page", docId: "7", kind: "collection" } as const;

const openForm = { document: { ...PAGE, locale: "en" }, editableSchema, formState };

const request = (overrides: Record<string, unknown> = {}) => ({
  ...PAGE,
  key: "image",
  locale: "en",
  type: VE_PICK_MEDIA_TYPE,
  ...overrides,
});

const picked = (data: unknown) => {
  const field = pickOfDocument(data, openForm.document);
  return field && mediaPickOf(field, openForm);
};

describe("a request of the preview page to pick media", () => {
  it("names the form path and the collection of an upload field of the open document", () => {
    expect(picked(request())).toEqual({
      collection: "media",
      field: { ...PAGE, key: "image", locale: "en" },
      path: "image",
    });
  });

  it("finds the row of a block by its id, also when the row holds no image", () => {
    expect(picked(request({ key: "layout.row-b.image" }))).toMatchObject({
      collection: "media",
      path: "layout.1.image",
    });
  });

  it.each([
    ["holds many documents", "gallery"],
    ["takes several collections", "eitherFile"],
    ["is hidden", "cover"],
    ["is not an upload", "title"],
    ["the form does not have", "layout.row-gone.image"],
  ])("takes no request for a field that %s", (_name, key) => {
    expect(picked(request({ key }))).toBeNull();
  });

  it("takes no request for a field whose form entry filters what it takes", () => {
    const filtered = {
      ...formState,
      image: { filterOptions: { media: { alt: { exists: true } } }, value: 3 },
    } as unknown as FormState;
    const field = pickOfDocument(request(), openForm.document);

    expect(field && mediaPickOf(field, { ...openForm, formState: filtered })).toBeNull();
  });

  it("takes no request of another locale than the form is in", () => {
    expect(picked(request({ locale: "de" }))).toBeNull();
    expect(picked(request({ locale: undefined }))).toBeNull();
  });

  it("is not a request of this document when it names another one or is another message", () => {
    expect(pickOfDocument(request({ docId: "8" }), openForm.document)).toBeNull();
    expect(pickOfDocument(request({ type: "ve:field-edit" }), openForm.document)).toBeNull();
    expect(pickOfDocument(request({ key: 5 }), openForm.document)).toBeNull();
    expect(pickOfDocument(null, openForm.document)).toBeNull();
  });
});

describe("what the preview page is told of the picked media", () => {
  it("is its address and its size", () => {
    const media = {
      filename: "a.png",
      height: 600,
      id: 3,
      url: "/api/media/file/a.png",
      width: 800,
    };

    expect(shownMediaOf(media)).toEqual({ height: 600, url: "/api/media/file/a.png", width: 800 });
  });

  it("leaves out a size the media does not have", () => {
    expect(shownMediaOf({ height: null, url: "/a.pdf", width: null })).toEqual({ url: "/a.pdf" });
  });

  it("is nothing for a document without an address", () => {
    expect(shownMediaOf({ id: 3 })).toBeNull();
    expect(shownMediaOf(null)).toBeNull();
  });
});

describe("reading the picked media", () => {
  const MEDIA = { id: 3, url: "/api/media/file/a.png" };

  it("asks the REST API for the document with the session of the editor", async () => {
    const fetchMedia = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(MEDIA), ok: true } as Response)
    );

    const media = await fetchPickedMedia("https://cms.example.com/api", "media", 3, fetchMedia);

    expect(media).toEqual(MEDIA);
    expect(fetchMedia).toHaveBeenCalledWith("https://cms.example.com/api/media/3?depth=0", {
      credentials: "include",
    });
  });

  it("answers nothing when the API refuses or cannot be reached", async () => {
    const refuse = vi.fn(() => Promise.resolve({ ok: false } as Response));
    const fail = vi.fn(() => Promise.reject(new Error("offline")));

    expect(await fetchPickedMedia("/api", "media", 3, refuse)).toBeNull();
    expect(await fetchPickedMedia("/api", "media", 3, fail)).toBeNull();
  });
});
