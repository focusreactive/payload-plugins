import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MediaApi, MediaLibrary } from "../../src/client/inlineEditing/mediaLibrary";

import {
  createMediaLibrary,
  FIELD_REFUSED,
  payloadMediaApi,
  UPLOAD_REFUSED,
} from "../../src/client/inlineEditing/mediaLibrary";

const PAYLOAD_API = "https://cms.example.com/api";

const FIELD = {
  collectionSlug: "page",
  docId: "1",
  key: "image",
  kind: "collection",
  locale: "en",
} as const;

const REQUEST = {
  ...FIELD,
  page: 2,
  search: "light",
} as const;

const LIGHTHOUSE = {
  alt: "A lighthouse",
  filename: "lighthouse.jpg",
  height: 600,
  id: 9,
  thumbnailUrl: "/api/media/file/lighthouse-small.jpg",
  url: "/api/media/file/lighthouse.jpg",
  width: 800,
};

const answerOf = (body: unknown, ok = true, status = ok ? 200 : 500) =>
  Promise.resolve({ json: () => Promise.resolve(body), ok, status } as Response);

describe("the media library of a page of its own", () => {
  let fetchApi: ReturnType<typeof vi.fn>;
  let library: MediaLibrary;

  beforeEach(() => {
    fetchApi = vi.fn();
    const api = payloadMediaApi(() => PAYLOAD_API, { fetch: fetchApi } as unknown as Window);
    library = createMediaLibrary(() => api);
  });

  describe("listing", () => {
    it("asks the endpoint with the session of the editor", async () => {
      fetchApi.mockReturnValue(
        answerOf({ collection: "media", documents: [], hasNextPage: false })
      );

      await library.list(REQUEST);

      const [url, init] = fetchApi.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${PAYLOAD_API}/visual-editing/media-options`);
      expect(init).toMatchObject({ credentials: "include", method: "POST" });
      expect(JSON.parse(init.body as string)).toEqual(REQUEST);
    });

    it("answers the collection, its documents and whether more follow", async () => {
      fetchApi.mockReturnValue(
        answerOf({
          collection: "media",
          descriptionField: "alt",
          documents: [LIGHTHOUSE],
          hasNextPage: true,
        })
      );

      expect(await library.list(REQUEST)).toEqual({
        collection: "media",
        descriptionField: "alt",
        documents: [LIGHTHOUSE],
        hasNextPage: true,
      });
    });

    it("leaves out a document it cannot show", async () => {
      fetchApi.mockReturnValue(
        answerOf({ collection: "media", documents: [{ id: 1 }, LIGHTHOUSE, null] })
      );

      expect(await library.list(REQUEST)).toMatchObject({ documents: [LIGHTHOUSE] });
    });

    it("says so when the endpoint answers that the field takes no media from the page", async () => {
      fetchApi.mockReturnValue(
        answerOf({ collection: null, documents: [], reason: "not-editable" }, false, 404)
      );

      expect(await library.list(REQUEST)).toBe(FIELD_REFUSED);
    });

    it("answers nothing for a refusal of another reason, whatever its status", async () => {
      fetchApi.mockReturnValueOnce(
        answerOf({ collection: null, documents: [], reason: "signed-out" }, false, 422)
      );
      expect(await library.list(REQUEST)).toBeNull();

      fetchApi.mockReturnValueOnce(answerOf({ collection: null, documents: [] }, false, 422));
      expect(await library.list(REQUEST)).toBeNull();
    });

    it("answers nothing when the endpoint refuses, answers no list or cannot be reached", async () => {
      fetchApi.mockReturnValueOnce(answerOf({ collection: null, documents: [] }, false));
      expect(await library.list(REQUEST)).toBeNull();

      fetchApi.mockReturnValueOnce(answerOf("<html>"));
      expect(await library.list(REQUEST)).toBeNull();

      fetchApi.mockRejectedValueOnce(new Error("offline"));
      expect(await library.list(REQUEST)).toBeNull();
    });
  });

  describe("uploading", () => {
    const file = new File(["pixels"], "lighthouse.jpg", { type: "image/jpeg" });

    it("posts the file to the collection with the session of the editor", async () => {
      fetchApi.mockReturnValue(answerOf({ doc: LIGHTHOUSE }));

      await library.upload(FIELD, "media", "alt", file);

      const [url, init] = fetchApi.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${PAYLOAD_API}/media?depth=0`);
      expect(init).toMatchObject({ credentials: "include", method: "POST" });
      expect((init.body as FormData).get("file")).toBe(file);
      expect(init.headers).toBeUndefined();
    });

    it("answers the created document, with the address Payload gave its thumbnail", async () => {
      const { thumbnailUrl, ...created } = LIGHTHOUSE;
      fetchApi.mockReturnValue(answerOf({ doc: { ...created, thumbnailURL: thumbnailUrl } }));

      expect(await library.upload(FIELD, "media", "alt", file)).toEqual({ media: LIGHTHOUSE });
    });

    it("answers the description of the created document from the field that describes the files", async () => {
      const { alt, ...created } = LIGHTHOUSE;
      fetchApi.mockReturnValue(answerOf({ doc: { ...created, caption: alt } }));

      expect(await library.upload(FIELD, "media", "caption", file)).toEqual({ media: LIGHTHOUSE });
      expect(await library.upload(FIELD, "media", null, file)).toEqual({ media: created });
    });

    it("answers the message of the server when it refuses the file", async () => {
      fetchApi.mockReturnValue(
        answerOf({ errors: [{ message: "The following field is invalid: alt" }] }, false)
      );

      expect(await library.upload(FIELD, "media", "alt", file)).toEqual({
        error: "The following field is invalid: alt",
      });
    });

    it("answers a message of its own when the server gives none or cannot be reached", async () => {
      fetchApi.mockReturnValueOnce(answerOf(null, false));
      expect(await library.upload(FIELD, "media", "alt", file)).toEqual({ error: UPLOAD_REFUSED });

      fetchApi.mockRejectedValueOnce(new Error("offline"));
      expect(await library.upload(FIELD, "media", "alt", file)).toEqual({ error: UPLOAD_REFUSED });
    });
  });
});

describe("the media library of a page that asks another API, such as the admin's", () => {
  const file = new File(["pixels"], "lighthouse.jpg", { type: "image/jpeg" });
  const NO_ANSWER = { answer: null, ok: false };
  let api: { list: ReturnType<typeof vi.fn>; upload: ReturnType<typeof vi.fn> };
  let apiOf: ReturnType<typeof vi.fn>;
  let library: MediaLibrary;

  beforeEach(() => {
    api = { list: vi.fn(), upload: vi.fn() };
    apiOf = vi.fn(() => api as unknown as MediaApi);
    library = createMediaLibrary(apiOf);
  });

  it("asks the API of the field it lists or uploads for", async () => {
    api.list.mockResolvedValue({ answer: { collection: "media", documents: [] }, ok: true });
    api.upload.mockResolvedValue({ answer: { doc: LIGHTHOUSE }, ok: true });

    await library.list(REQUEST);
    await library.upload(FIELD, "media", "alt", file);

    expect(apiOf.mock.calls).toEqual([[REQUEST], [FIELD]]);
    expect(api.list).toHaveBeenCalledWith(REQUEST);
    expect(api.upload).toHaveBeenCalledWith(FIELD, "media", file);
  });

  it("says the field is refused when the API refuses it, and answers nothing without an answer", async () => {
    api.list.mockResolvedValueOnce({ answer: { reason: "not-editable" }, ok: false });
    expect(await library.list(REQUEST)).toBe(FIELD_REFUSED);

    api.list.mockResolvedValueOnce(NO_ANSWER);
    expect(await library.list(REQUEST)).toBeNull();
  });

  it("answers the message of the server the API passes on, or its own without one", async () => {
    api.upload.mockResolvedValueOnce({
      answer: { errors: [{ message: "The file is too large" }] },
      ok: false,
    });
    expect(await library.upload(FIELD, "media", "alt", file)).toEqual({
      error: "The file is too large",
    });

    api.upload.mockResolvedValueOnce(NO_ANSWER);
    expect(await library.upload(FIELD, "media", "alt", file)).toEqual({ error: UPLOAD_REFUSED });

    api.upload.mockResolvedValueOnce({ answer: { reason: "not-editable" }, ok: false });
    expect(await library.upload(FIELD, "media", "alt", file)).toEqual({ error: UPLOAD_REFUSED });
  });
});
