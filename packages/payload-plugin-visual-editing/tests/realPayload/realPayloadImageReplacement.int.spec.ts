import type { Access, Payload, PayloadRequest } from "payload";

import { createLocalReq } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { VeMediaOptions } from "../../src/shared/protocol";

import { MEDIA_PAGE_SIZE } from "../../src/server/fieldEdit/mediaOptionsEndpoint";
import { VE_FIELD_EDIT_PATH, VE_MEDIA_OPTIONS_PATH } from "../../src/shared/protocol";

import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { page } from "../support/richTextPages";
import { EDITOR, OUTSIDER, signIn } from "../support/unsavedRichTextRequests";

type Answered<Body> = { body: Body; status: number };

type Row = { id: string; [field: string]: unknown };

const PRIVATE_ALT = "Private";

const NOTHING_LISTED: VeMediaOptions = { collection: null, documents: [], hasNextPage: false };

const everyoneButTheOutsider: Access = ({ req }) => req.user?.email !== OUTSIDER.email;

const whatIsNotPrivate: Access = () => ({ alt: { not_equals: PRIVATE_ALT } });

describe("replacing an image through the endpoints", () => {
  let payload: Payload;
  let editor: Headers;
  let outsider: Headers;
  let harbour: string;
  let lighthouse: string;
  let secretPhoto: string;
  let brochure: string;

  const post = async <Body>(path: string, body: object, headers: Headers) => {
    const endpoint = payload.config.endpoints.find((candidate) => candidate.path === path);
    const { user } = await payload.auth({ headers });
    const req = await createLocalReq(
      { req: { headers } as Partial<PayloadRequest>, user: user ?? undefined },
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

  const options = (body: object, headers = editor): Promise<Answered<VeMediaOptions>> =>
    post<VeMediaOptions>(VE_MEDIA_OPTIONS_PATH, { page: 1, search: "", ...body }, headers);

  const upload = async (collection: "documents" | "media", name: string, alt: string) => {
    const created = await payload.create({
      collection,
      data: { alt },
      file: { data: Buffer.from(name), mimetype: "text/plain", name, size: name.length },
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
      name: "image-replacement",
      plugin: { inlineEditing: true, instantPreview: true },
    });
    editor = await signIn(payload, EDITOR);
    outsider = await signIn(payload, OUTSIDER);
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

    describe("saves nothing", () => {
      let docId: string;

      beforeAll(async () => {
        docId = await publish({
          brochure: Number(brochure),
          eitherFile: { relationTo: "media", value: Number(harbour) },
          gallery: [Number(harbour)],
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
        hiddenImage: Number(harbour),
        image: Number(harbour),
        label: "Kept",
      });
    });

    it("lists the documents of the collection the field takes", async () => {
      const { body, status } = await options({ ...page(docId), key: "image" });

      expect(status).toBe(200);
      expect(body.collection).toBe("media");
      expect(body.documents).toContainEqual({
        alt: "A harbour",
        filename: "harbour.txt",
        id: Number(harbour),
        thumbnailUrl: "/api/media/file/harbour.txt",
        url: "/api/media/file/harbour.txt",
      });
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
        ["a text field", "label"],
        ["a field the schema does not have", "missing"],
      ])("for %s", async (_name, key) => {
        expect(await options({ ...page(docId), key })).toEqual({
          body: NOTHING_LISTED,
          status: 422,
        });
      });

      it("for a request without a user", async () => {
        expect(await options({ ...page(docId), key: "image" }, new Headers())).toEqual({
          body: NOTHING_LISTED,
          status: 401,
        });
      });

      it("for a user who cannot read the document", async () => {
        expect(await options({ ...page(docId), key: "image" }, outsider)).toEqual({
          body: NOTHING_LISTED,
          status: 422,
        });
      });

      it("for a request that names no locale, in a project with locales", async () => {
        expect(await options({ ...page(docId), key: "image", locale: undefined })).toEqual({
          body: NOTHING_LISTED,
          status: 400,
        });
      });

      it.each([
        ["no page", { page: undefined }],
        ["a page before the first", { page: 0 }],
        ["no search", { search: undefined }],
      ])("for a request with %s", async (_name, body) => {
        expect(await options({ ...page(docId), key: "image", ...body })).toEqual({
          body: NOTHING_LISTED,
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

        expect(answer).toEqual({ body: NOTHING_LISTED, status: 404 });
      });

      it("for a collection without drafts", async () => {
        const author = await payload.create({ collection: "authors", data: { name: "Ada" } });

        const answer = await options({
          collectionSlug: "authors",
          docId: String(author.id),
          key: "image",
          kind: "collection",
        });

        expect(answer).toEqual({ body: NOTHING_LISTED, status: 409 });
      });
    });
  });
});
