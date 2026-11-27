import type { Access, Payload, PayloadRequest } from "payload";

import { createLocalReq } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { VeMediaOptions } from "../../src/shared/protocol";

import { MEDIA_PAGE_SIZE } from "../../src/server/fieldEdit/mediaOptionsEndpoint";
import { VE_FIELD_EDIT_PATH, VE_MEDIA_OPTIONS_PATH } from "../../src/shared/protocol";

import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { page } from "../support/richTextPages";
import { EDITOR, OUTSIDER, READER, signIn, WRITER } from "../support/unsavedRichTextRequests";

type Answered<Body> = { body: Body; status: number };

type Row = { id: string; [field: string]: unknown };

const PRIVATE_ALT = "Private";

const NOTHING_LISTED: VeMediaOptions = {
  collection: null,
  descriptionField: null,
  documents: [],
  hasNextPage: false,
};

const LIBRARIAN = { email: "librarian@example.com", password: "librarian-password" };

const failsToReadADocumentFor =
  (email: string, access: Access): Access =>
  (args) => {
    if (args.id !== undefined && args.req.user?.email === email) {
      throw new Error("The database is unreachable");
    }
    return access(args);
  };

const everyoneButTheOutsider = failsToReadADocumentFor(
  WRITER.email,
  ({ req }) => req.user?.email !== OUTSIDER.email
);

const everyoneButTheReader: Access = ({ req }) => req.user?.email !== READER.email;

const whatIsNotPrivate = failsToReadADocumentFor(LIBRARIAN.email, () => ({
  alt: { not_equals: PRIVATE_ALT },
}));

const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

describe("replacing an image through the endpoints", () => {
  let payload: Payload;
  let editor: Headers;
  let outsider: Headers;
  let writer: Headers;
  let librarian: Headers;
  let reader: Headers;
  let harbour: string;
  let lighthouse: string;
  let secretPhoto: string;
  let brochure: string;

  const post = async <Body>(path: string, body: object, headers: Headers) => {
    const endpoint = payload.config.endpoints.find((candidate) => candidate.path === path);
    const { user } = await payload.auth({ headers });
    const sent = new Headers(headers);
    sent.set("Content-Type", "application/json");
    const req = await createLocalReq(
      { req: { headers: sent } as Partial<PayloadRequest>, user: user ?? undefined },
      payload
    );
    req.text = async () => JSON.stringify({ locale: "en", ...body });
    const response = (await endpoint!.handler(req)) as Response;
    return { body: (await response.json()) as Body, status: response.status };
  };

  const replace = async (body: object, headers = editor) => {
    const answer = await post<{ saved: unknown }>(VE_FIELD_EDIT_PATH, body, headers);
    return { saved: answer.body.saved, status: answer.status };
  };

  const refusalOf = async (body: object) =>
    (await post<{ reason?: unknown }>(VE_FIELD_EDIT_PATH, body, editor)).body.reason;

  const options = (body: object, headers = editor): Promise<Answered<VeMediaOptions>> =>
    post<VeMediaOptions>(VE_MEDIA_OPTIONS_PATH, { page: 1, search: "", ...body }, headers);

  const contentOf = (mimetype: string, name: string): Buffer =>
    mimetype === "image/png" ? Buffer.from(ONE_PIXEL_PNG, "base64") : Buffer.from(name);

  const upload = async (
    collection: "documents" | "media",
    name: string,
    alt: string,
    mimetype = "image/png"
  ) => {
    const created = await payload.create({
      collection,
      data: { alt },
      file: {
        data: contentOf(mimetype, name),
        mimetype,
        name,
        size: contentOf(mimetype, name).length,
      },
    });
    return String(created.id);
  };

  const publish = async (data: Record<string, unknown>) => {
    const created = await payload.create({
      collection: "pages",
      data: { ...data, _status: "published" },
      locale: "en",
    });
    return String(created.id);
  };

  const read = (docId: string, draft: boolean, locale = "en") =>
    payload.findByID({
      collection: "pages",
      context: { visualEditing: false },
      depth: 0,
      draft,
      id: docId,
      locale,
      showHiddenFields: true,
    }) as Promise<Record<string, unknown>>;

  beforeAll(async () => {
    payload = await startRealPayload({
      canRead: everyoneButTheOutsider,
      canReadMedia: whatIsNotPrivate,
      canUpdate: everyoneButTheReader,
      name: "image-replacement",
      plugin: { inlineEditing: true, instantPreview: true },
    });
    editor = await signIn(payload, EDITOR);
    outsider = await signIn(payload, OUTSIDER);
    writer = await signIn(payload, WRITER);
    librarian = await signIn(payload, LIBRARIAN);
    reader = await signIn(payload, READER);
    harbour = await upload("media", "harbour.txt", "A harbour");
    lighthouse = await upload("media", "lighthouse.txt", "A lighthouse");
    secretPhoto = await upload("media", "secret.txt", PRIVATE_ALT);
    brochure = await upload("documents", "brochure.txt", "A brochure");
  }, START_TIMEOUT_MS);

  afterAll(async () => {
    await payload.destroy();
  });

  describe("an edit of an upload field", () => {
    it("writes the media document into the draft and leaves the published document as it is", async () => {
      const docId = await publish({ image: Number(harbour) });

      const answer = await replace({ ...page(docId), key: "image", value: lighthouse });

      expect(answer).toEqual({ saved: true, status: 200 });
      expect(String((await read(docId, true)).image)).toBe(lighthouse);
      expect(String((await read(docId, false)).image)).toBe(harbour);
    });

    it("writes the image of one block row and keeps its other fields", async () => {
      const docId = await publish({
        layout: [{ blockType: "hero", heading: "Welcome", image: Number(harbour) }],
      });
      const [hero] = (await read(docId, true)).layout as Row[];

      await replace({ ...page(docId), key: `layout.${hero!.id}.image`, value: lighthouse });

      const [edited] = (await read(docId, true)).layout as Row[];
      expect(edited).toMatchObject({ heading: "Welcome" });
      expect(String(edited!.image)).toBe(lighthouse);
    });

    it("writes a localized upload field in the locale of the edit alone", async () => {
      const docId = await publish({ localizedImage: Number(harbour) });

      await replace({ ...page(docId), key: "localizedImage", locale: "de", value: lighthouse });

      expect(String((await read(docId, true, "de")).localizedImage)).toBe(lighthouse);
      expect(String((await read(docId, true, "en")).localizedImage)).toBe(harbour);
    });

    it("is saved when the draft holds the media it began from", async () => {
      const docId = await publish({ image: Number(harbour) });

      const answer = await replace({
        ...page(docId),
        base: harbour,
        key: "image",
        value: lighthouse,
      });

      expect(answer).toEqual({ saved: true, status: 200 });
      expect(String((await read(docId, true)).image)).toBe(lighthouse);
    });

    it("is refused as changed when the field was given other media after the page showed it", async () => {
      const docId = await publish({ image: Number(harbour) });
      await payload.update({
        collection: "pages",
        data: { image: Number(secretPhoto) },
        draft: true,
        id: docId,
        locale: "en",
      });

      const reason = await refusalOf({
        ...page(docId),
        base: harbour,
        key: "image",
        value: lighthouse,
      });

      expect(reason).toBe("changed");
      expect(String((await read(docId, true)).image)).toBe(secretPhoto);
    });

    describe("saves nothing", () => {
      let docId: string;

      beforeAll(async () => {
        docId = await publish({
          brochure: Number(brochure),
          eitherFile: { relationTo: "media", value: Number(harbour) },
          gallery: [Number(harbour)],
          filteredImage: Number(harbour),
          hiddenImage: Number(harbour),
          image: Number(harbour),
          label: "Kept",
          related: Number(await publish({ label: "Related" })),
        });
      });

      const refused = async (body: Record<string, unknown>, headers?: Headers) => {
        const before = await read(docId, true);
        const answer = await replace({ ...page(docId), value: lighthouse, ...body }, headers);
        const { updatedAt: _updatedAt, ...draft } = await read(docId, true);
        expect(before).toMatchObject(draft);
        return answer;
      };

      it.each([
        ["an upload field that holds many documents", "gallery"],
        ["an upload field of several collections", "eitherFile"],
        ["a hidden upload field", "hiddenImage"],
        ["an upload field that filters what it takes", "filteredImage"],
        ["a relationship field", "related"],
        ["an upload field that holds no document yet", "localizedImage"],
        ["a field the schema does not have", "missing"],
      ])("for %s", async (_name, key) => {
        expect(await refused({ key })).toEqual({ saved: false, status: 422 });
      });

      it("for a media document that does not exist", async () => {
        expect(await refused({ key: "image", value: "987654" })).toEqual({
          saved: false,
          status: 422,
        });
      });

      it("for an id the collection of the field cannot have", async () => {
        expect(await refused({ key: "image", value: "not-a-number" })).toEqual({
          saved: false,
          status: 422,
        });
      });

      it("for a media document the user cannot read", async () => {
        expect(await refused({ key: "image", value: secretPhoto })).toEqual({
          saved: false,
          status: 422,
        });
      });

      it("for a request without a user", async () => {
        expect(await refused({ key: "image" }, new Headers())).toEqual({
          saved: false,
          status: 401,
        });
      });

      it("for a user who cannot read the document", async () => {
        expect(await refused({ key: "image" }, outsider)).toEqual({ saved: false, status: 422 });
      });

      it("and says why when the draft cannot be read", async () => {
        const body = { ...page(docId), key: "image", value: lighthouse };

        const answer = await post(VE_FIELD_EDIT_PATH, body, writer);

        expect(answer).toEqual({ body: { reason: "failed", saved: false }, status: 500 });
      });

      it("and says why when the media document cannot be read", async () => {
        const body = { ...page(docId), key: "image", value: lighthouse };

        const answer = await post(VE_FIELD_EDIT_PATH, body, librarian);

        expect(answer).toEqual({ body: { reason: "failed", saved: false }, status: 500 });
      });

      it("for a collection without drafts", async () => {
        const author = await payload.create({ collection: "authors", data: { name: "Ada" } });

        const answer = await replace({
          collectionSlug: "authors",
          docId: String(author.id),
          key: "image",
          kind: "collection",
          value: lighthouse,
        });

        expect(answer).toEqual({ saved: false, status: 409 });
      });
    });
  });

  describe("the media options endpoint", () => {
    let docId: string;

    beforeAll(async () => {
      docId = await publish({
        brochure: Number(brochure),
        eitherFile: { relationTo: "media", value: Number(harbour) },
        gallery: [Number(harbour)],
        filteredImage: Number(harbour),
        hiddenImage: Number(harbour),
        image: Number(harbour),
        label: "Kept",
      });
    });

    it("lists the documents of the collection the field takes", async () => {
      const { body, status } = await options({ ...page(docId), key: "image" });

      expect(status).toBe(200);
      expect(body.collection).toBe("media");
      expect(body.descriptionField).toBe("alt");
      expect(body.documents).toContainEqual({
        alt: "A harbour",
        filename: "harbour.txt",
        height: 1,
        id: Number(harbour),
        thumbnailUrl: "/api/media/file/harbour.txt",
        url: "/api/media/file/harbour.txt",
        width: 1,
      });
    });

    it("lists only images, since it offers the media to replace an image with", async () => {
      await upload("media", "notes.json", "Notes", "application/json");
      await upload("media", "terms.pdf", "Terms", "application/pdf");

      const { body } = await options({ ...page(docId), key: "image" });

      const listed = body.documents.map(({ filename }) => filename);
      expect(listed).toContain("harbour.txt");
      expect(listed).not.toContain("notes.json");
      expect(listed).not.toContain("terms.pdf");
    });

    it("lists the collection of the field, not another upload collection", async () => {
      const { body } = await options({ ...page(docId), key: "brochure" });

      expect(body.collection).toBe("documents");
      expect(body.documents.map(({ filename }) => filename)).toContain("brochure.txt");
      expect(body.documents.map(({ filename }) => filename)).not.toContain("harbour.txt");
    });

    it("leaves out the documents the user cannot read", async () => {
      const { body } = await options({ ...page(docId), key: "image" });

      expect(body.documents.map(({ id }) => String(id))).not.toContain(secretPhoto);
    });

    it("lists only the documents whose file name holds the search", async () => {
      const { body } = await options({ ...page(docId), key: "image", search: "lightho" });

      expect(body.documents.map(({ filename }) => filename)).toEqual(["lighthouse.txt"]);
      expect(body.hasNextPage).toBe(false);
    });

    it("answers one page at a time and says when another follows", async () => {
      const names = Array.from({ length: MEDIA_PAGE_SIZE + 1 }, (_, index) => `paged-${index}.txt`);
      for (const name of names) await upload("media", name, "Paged");

      const first = await options({ ...page(docId), key: "image", search: "paged-" });
      const second = await options({ ...page(docId), key: "image", page: 2, search: "paged-" });

      expect(first.body.documents).toHaveLength(MEDIA_PAGE_SIZE);
      expect(first.body.hasNextPage).toBe(true);
      expect(second.body.documents).toHaveLength(1);
      expect(second.body.hasNextPage).toBe(false);
      const listed = [...first.body.documents, ...second.body.documents];
      expect(new Set(listed.map(({ filename }) => filename))).toEqual(new Set(names));
    });

    describe("lists nothing", () => {
      it.each([
        ["an upload field that holds many documents", "gallery"],
        ["an upload field of several collections", "eitherFile"],
        ["a hidden upload field", "hiddenImage"],
        ["an upload field that filters what it takes", "filteredImage"],
        ["a text field", "label"],
        ["a field the schema does not have", "missing"],
      ])("for %s", async (_name, key) => {
        expect(await options({ ...page(docId), key })).toEqual({
          body: { ...NOTHING_LISTED, reason: "not-editable" },
          status: 422,
        });
      });

      it("for a user who may read the document and not update it", async () => {
        expect(await options({ ...page(docId), key: "image" }, reader)).toEqual({
          body: { ...NOTHING_LISTED, reason: "not-editable" },
          status: 403,
        });
      });

      it("for a request without a user", async () => {
        expect(await options({ ...page(docId), key: "image" }, new Headers())).toEqual({
          body: { ...NOTHING_LISTED, reason: "signed-out" },
          status: 401,
        });
      });

      it("for a user who cannot read the document", async () => {
        expect(await options({ ...page(docId), key: "image" }, outsider)).toEqual({
          body: { ...NOTHING_LISTED, reason: "not-editable" },
          status: 422,
        });
      });

      it("for a draft that cannot be read", async () => {
        expect(await options({ ...page(docId), key: "image" }, writer)).toEqual({
          body: { ...NOTHING_LISTED, reason: "failed" },
          status: 500,
        });
      });

      it("for a request that names no locale, in a project with locales", async () => {
        expect(await options({ ...page(docId), key: "image", locale: undefined })).toEqual({
          body: { ...NOTHING_LISTED, reason: "failed" },
          status: 400,
        });
      });

      it.each([
        ["no page", { page: undefined }],
        ["a page before the first", { page: 0 }],
        ["no search", { search: undefined }],
      ])("for a request with %s", async (_name, body) => {
        expect(await options({ ...page(docId), key: "image", ...body })).toEqual({
          body: { ...NOTHING_LISTED, reason: "unreadable" },
          status: 400,
        });
      });

      it("for a document that does not exist", async () => {
        const answer = await options({
          collectionSlug: "missing",
          docId: "1",
          key: "image",
          kind: "collection",
        });

        expect(answer).toEqual({
          body: { ...NOTHING_LISTED, reason: "not-editable" },
          status: 404,
        });
      });

      it("for a collection without drafts", async () => {
        const author = await payload.create({ collection: "authors", data: { name: "Ada" } });

        const answer = await options({
          collectionSlug: "authors",
          docId: String(author.id),
          key: "image",
          kind: "collection",
        });

        expect(answer).toEqual({ body: { ...NOTHING_LISTED, reason: "no-drafts" }, status: 409 });
      });
    });
  });
});
