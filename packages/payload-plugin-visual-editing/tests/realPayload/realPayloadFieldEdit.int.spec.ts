import type { Access, Payload, PayloadRequest } from "payload";

import { createLocalReq } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { VE_FIELD_EDIT_PATH } from "../../src/shared/protocol";
import { withMarker } from "../../src/shared/stegaText";

import { START_TIMEOUT_MS, richText, startRealPayload } from "../support/realPayload";
import { page } from "../support/richTextPages";
import { EDITOR, OUTSIDER, signIn } from "../support/unsavedRichTextRequests";

type Answer = { status: number; saved: unknown };

type Row = { id: string; [field: string]: unknown };

const everyoneButTheOutsider: Access = ({ req }) => req.user?.email !== OUTSIDER.email;

describe("the field edit endpoint", () => {
  let payload: Payload;
  let editor: Headers;
  let outsider: Headers;

  const edit = async (body: unknown, headers = editor): Promise<Answer> => {
    const endpoint = payload.config.endpoints.find(({ path }) => path === VE_FIELD_EDIT_PATH);
    const { user } = await payload.auth({ headers });
    const req = await createLocalReq(
      { req: { headers } as Partial<PayloadRequest>, user: user ?? undefined },
      payload
    );
    req.text = async () => JSON.stringify({ locale: "en", ...(body as object) });
    const response = (await endpoint!.handler(req)) as Response;
    const { saved } = (await response.json()) as { saved: unknown };
    return { saved, status: response.status };
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
    }) as Promise<Record<string, unknown>>;

  beforeAll(async () => {
    payload = await startRealPayload({
      canRead: everyoneButTheOutsider,
      name: "field-edit",
      plugin: { inlineEditing: true, instantPreview: true },
    });
    editor = await signIn(payload, EDITOR);
    outsider = await signIn(payload, OUTSIDER);
  }, START_TIMEOUT_MS);

  afterAll(async () => {
    await payload.destroy();
  });

  it("writes the text into the draft and leaves the published document as it is", async () => {
    const docId = await publish({ label: "Old" });

    const answer = await edit({ ...page(docId), key: "label", value: "New" });

    expect(answer).toEqual({ saved: true, status: 200 });
    expect((await read(docId, true)).label).toBe("New");
    expect((await read(docId, false)).label).toBe("Old");
  });

  it("writes one row of a list and keeps the other rows", async () => {
    const docId = await publish({ list: [{ label: "First" }, { label: "Second" }] });
    const [, second] = (await read(docId, true)).list as Row[];

    await edit({ ...page(docId), key: `list.${second!.id}.label`, value: "Changed" });

    const rows = (await read(docId, true)).list as Row[];
    expect(rows.map(({ label }) => label)).toEqual(["First", "Changed"]);
  });

  it("keeps the other fields of a block row, references included", async () => {
    const pickedId = await publish({ label: "Picked" });
    const docId = await publish({
      layout: [
        { blockType: "hero", body: richText("Body"), heading: "Old", picked: Number(pickedId) },
      ],
    });
    const [hero] = (await read(docId, true)).layout as Row[];

    await edit({ ...page(docId), key: `layout.${hero!.id}.heading`, value: "New" });

    const [edited] = (await read(docId, true)).layout as Row[];
    expect(edited).toMatchObject({ body: richText("Body"), heading: "New" });
    expect(String(edited!.picked)).toBe(pickedId);
  });

  it("writes a localized field in the locale of the edit alone", async () => {
    const docId = await publish({ title: "English" });

    await edit({ ...page(docId), key: "title", locale: "de", value: "Deutsch" });

    expect((await read(docId, true, "de")).title).toBe("Deutsch");
    expect((await read(docId, true, "en")).title).toBe("English");
  });

  it("joins the lines of a single-line field and keeps those of a textarea", async () => {
    const docId = await publish({ label: "Old", seo: { description: "Old" } });

    await edit({ ...page(docId), key: "label", value: "One\nTwo" });
    await edit({ ...page(docId), key: "seo.description", value: "One\nTwo" });

    const draft = await read(docId, true);
    expect(draft.label).toBe("One Two");
    expect(draft.seo).toEqual({ description: "One\nTwo" });
  });

  it("saves the text without the marker the page read it with", async () => {
    const docId = await publish({ label: "Old" });

    await edit({ ...page(docId), key: "label", value: withMarker("New", { path: "label" }) });

    expect((await read(docId, true)).label).toBe("New");
  });

  describe("saves nothing", () => {
    let docId: string;

    beforeAll(async () => {
      docId = await publish({
        body: richText("Body"),
        internal: { label: "Internal" },
        label: "Kept",
        list: [{ label: "Row" }],
        reference: "Reference",
        secret: "Secret",
      });
    });

    const refused = async (body: Record<string, unknown>, headers?: Headers) => {
      const answer = await edit({ ...page(docId), value: "Changed", ...body }, headers);
      const draft = await payload.findByID({
        collection: "pages",
        context: { visualEditing: false },
        depth: 0,
        draft: true,
        id: docId,
        showHiddenFields: true,
      });
      expect(draft).toMatchObject({
        internal: { label: "Internal" },
        label: "Kept",
        reference: "Reference",
        secret: "Secret",
      });
      return answer;
    };

    it("for a request without a user", async () => {
      expect(await refused({ key: "label" }, new Headers())).toEqual({ saved: false, status: 401 });
    });

    it("for a user who cannot read the document", async () => {
      expect(await refused({ key: "label" }, outsider)).toEqual({ saved: false, status: 422 });
    });

    it("for an edit without a value", async () => {
      expect(await refused({ key: "label", value: undefined })).toEqual({
        saved: false,
        status: 400,
      });
    });

    it("for an edit that names no locale, in a project with locales", async () => {
      expect(await refused({ key: "label", locale: undefined })).toEqual({
        saved: false,
        status: 400,
      });
    });

    it("for a document another editor has open", async () => {
      const [other] = (
        await payload.find({ collection: "users", where: { email: { equals: OUTSIDER.email } } })
      ).docs;
      const lock = await payload.create({
        collection: "payload-locked-documents",
        data: {
          document: { relationTo: "pages", value: Number(docId) },
          user: { relationTo: "users", value: other!.id },
        },
      });

      const answer = await refused({ key: "label" });
      const locks = await payload.find({ collection: "payload-locked-documents" });
      await payload.delete({ collection: "payload-locked-documents", id: lock.id });

      expect(answer.saved).toBe(false);
      expect(locks.docs.map(({ id }) => id)).toEqual([lock.id]);
    });

    it("for a locale the project does not have", async () => {
      expect(await refused({ key: "label", locale: "fr" })).toEqual({ saved: false, status: 400 });
    });

    it("for a document that does not exist", async () => {
      const answer = await edit({
        collectionSlug: "missing",
        docId: "1",
        key: "label",
        kind: "collection",
        value: "A",
      });

      expect(answer).toEqual({ saved: false, status: 404 });
    });

    it.each([
      ["a rich text field", "body"],
      ["a hidden field", "secret"],
      ["a read-only field", "reference"],
      ["an excluded field", "internal.label"],
      ["a field the schema does not have", "missing"],
      ["a row that is gone", "list.gone.label"],
      ["a list", "list"],
      ["a field that holds no text yet", "seo.description"],
    ])("for %s", async (_name, key) => {
      expect(await refused({ key })).toEqual({ saved: false, status: 422 });
    });

    it("for a collection without drafts", async () => {
      const author = await payload.create({ collection: "authors", data: { name: "Ada" } });

      const answer = await edit({
        collectionSlug: "authors",
        docId: String(author.id),
        key: "name",
        kind: "collection",
        value: "Changed",
      });

      expect(answer).toEqual({ saved: false, status: 409 });
      expect((await payload.findByID({ collection: "authors", id: author.id })).name).toBe("Ada");
    });

    it("for a global without drafts", async () => {
      const answer = await edit({
        collectionSlug: "settings",
        key: "siteName",
        kind: "global",
        value: "A",
      });

      expect(answer).toEqual({ saved: false, status: 409 });
    });

    it("for a user document", async () => {
      const [user] = (await payload.find({ collection: "users", limit: 1 })).docs;

      const answer = await edit({
        collectionSlug: "users",
        docId: String(user!.id),
        key: "email",
        kind: "collection",
        value: "changed@example.com",
      });

      expect(answer).toEqual({ saved: false, status: 409 });
    });
  });
});
