import type { Access, Payload, PayloadRequest } from "payload";

import { createLocalReq } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { VE_FIELD_EDIT_PATH } from "../../src/shared/protocol";
import { withMarker } from "../../src/shared/stegaText";

import { START_TIMEOUT_MS, richText, startRealPayload } from "../support/realPayload";
import { page } from "../support/richTextPages";
import { EDITOR, OUTSIDER, READER, signIn } from "../support/unsavedRichTextRequests";

type Answer = { status: number; saved: unknown };

type Row = { id: string; [field: string]: unknown };

type Stored = Record<string, unknown>;

const everyoneButTheOutsider: Access = ({ req }) => req.user?.email !== OUTSIDER.email;
const everyoneButTheReader: Access = ({ req }) => req.user?.email !== READER.email;

const withoutUpdatedAt = ({ updatedAt: _updatedAt, ...rest }: Stored): Stored => rest;

describe("the field edit endpoint", () => {
  let payload: Payload;
  let editor: Headers;
  let outsider: Headers;
  let reader: Headers;

  const post = async (body: unknown, headers: Headers, contentType = "application/json") => {
    const endpoint = payload.config.endpoints.find(({ path }) => path === VE_FIELD_EDIT_PATH);
    const { user } = await payload.auth({ headers });
    const sent = new Headers(headers);
    sent.set("Content-Type", contentType);
    const req = await createLocalReq(
      { req: { headers: sent } as Partial<PayloadRequest>, user: user ?? undefined },
      payload
    );
    req.text = async () => JSON.stringify({ locale: "en", ...(body as object) });
    const response = (await endpoint!.handler(req)) as Response;
    const answered = (await response.json()) as {
      reason?: unknown;
      saved: unknown;
      value?: unknown;
    };
    return { ...answered, status: response.status };
  };

  const edit = async (body: unknown, headers = editor): Promise<Answer> => {
    const { saved, status } = await post(body, headers);
    return { saved, status };
  };

  const reasonOf = async (body: unknown, headers = editor): Promise<unknown> =>
    (await post(body, headers)).reason;

  const publish = async (data: Record<string, unknown>) => {
    const created = await payload.create({
      collection: "pages",
      data: { ...data, _status: "published" },
      locale: "en",
    });
    return String(created.id);
  };

  const createDraft = async (data: Record<string, unknown>) => {
    const created = await payload.create({ collection: "pages", data, draft: true, locale: "en" });
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
      canUpdate: everyoneButTheReader,
      name: "field-edit",
      plugin: { inlineEditing: true, instantPreview: true },
    });
    editor = await signIn(payload, EDITOR);
    outsider = await signIn(payload, OUTSIDER);
    reader = await signIn(payload, READER);
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

  it("writes the edited locale alone and leaves every other field and locale as it was", async () => {
    const docId = await publish({
      label: "Plain",
      localizedBody: richText("English body"),
      localizedList: [{ label: "English row" }],
      title: "English",
    });
    await payload.update({
      collection: "pages",
      data: {
        localizedBody: richText("Deutscher Text"),
        localizedList: [{ label: "Deutsche Zeile" }],
        title: "Deutsch",
      },
      draft: true,
      id: docId,
      locale: "de",
    });
    const english = await read(docId, true, "en");
    const german = await read(docId, true, "de");
    const published = await read(docId, false, "en");

    const answer = await edit({ ...page(docId), key: "title", locale: "de", value: "Neu" });

    expect(answer).toEqual({ saved: true, status: 200 });
    expect(withoutUpdatedAt(await read(docId, true, "en"))).toEqual(withoutUpdatedAt(english));
    expect(withoutUpdatedAt(await read(docId, true, "de"))).toEqual(
      withoutUpdatedAt({ ...german, title: "Neu" })
    );
    expect(await read(docId, false, "en")).toEqual(published);
  });

  it("writes one row of a localized list in the locale of the edit and keeps the rows of the other locale", async () => {
    const docId = await publish({ localizedList: [{ label: "English row" }] });
    await payload.update({
      collection: "pages",
      data: { localizedList: [{ label: "Erste" }, { label: "Zweite" }] },
      draft: true,
      id: docId,
      locale: "de",
    });
    const english = await read(docId, true, "en");
    const german = await read(docId, true, "de");
    const [, second] = german.localizedList as Row[];
    const expected = structuredClone(german);
    (expected.localizedList as Row[])[1]!.label = "Geändert";

    await edit({
      ...page(docId),
      key: `localizedList.${second!.id}.label`,
      locale: "de",
      value: "Geändert",
    });

    expect(withoutUpdatedAt(await read(docId, true, "de"))).toEqual(withoutUpdatedAt(expected));
    expect(withoutUpdatedAt(await read(docId, true, "en"))).toEqual(withoutUpdatedAt(english));
  });

  it("writes the field of one block row and leaves every other row and field as it was", async () => {
    const pickedId = await publish({ label: "Picked" });
    const docId = await createDraft({
      label: "Kept",
      layout: [
        {
          blockType: "hero",
          body: richText("First body"),
          heading: "First",
          picked: Number(pickedId),
        },
        { blockType: "hero", body: richText("Second body"), heading: "Second" },
        { blockType: "hero", body: richText("Third body"), heading: "Third" },
      ],
      list: [{ label: "Row" }],
    });
    const before = await read(docId, true);
    const [, second] = before.layout as Row[];
    const expected = structuredClone(before);
    (expected.layout as Row[])[1]!.heading = "Changed";

    const answer = await edit({
      ...page(docId),
      key: `layout.${second!.id}.heading`,
      value: "Changed",
    });

    expect(answer).toEqual({ saved: true, status: 200 });
    expect(withoutUpdatedAt(await read(docId, true))).toEqual(withoutUpdatedAt(expected));
  });

  it("writes a field of a global and leaves its other fields empty in that locale", async () => {
    await payload.updateGlobal({
      data: { banner: { subtitle: "Subtitle", title: "Title" } },
      locale: "en",
      slug: "notice",
    });
    const notice = { collectionSlug: "notice", kind: "global" };

    const answer = await edit({ ...notice, key: "banner.title", locale: "de", value: "Titel" });

    const german = await payload.findGlobal({
      context: { visualEditing: false },
      draft: true,
      fallbackLocale: false,
      locale: "de",
      slug: "notice",
    });
    expect(answer).toEqual({ saved: true, status: 200 });
    expect(german.banner).toMatchObject({ title: "Titel" });
    expect((german.banner as { subtitle?: string | null }).subtitle ?? null).toBeNull();
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

  it("counts a text a hook of the field changed on the way in as saved", async () => {
    const docId = await publish({ trimmed: "Old" });

    const answer = await edit({ ...page(docId), key: "trimmed", value: "  New  " });

    expect(answer).toEqual({ saved: true, status: 200 });
    expect((await read(docId, true)).trimmed).toBe("New");
  });

  it("counts an edit that sends the text the field holds as saved", async () => {
    const docId = await publish({ label: "Same" });

    expect(await edit({ ...page(docId), key: "label", value: "Same" })).toEqual({
      saved: true,
      status: 200,
    });
  });

  describe("an edit that names the text it began from", () => {
    const changeInTheAdmin = (docId: string, data: Record<string, unknown>) =>
      payload.update({ collection: "pages", data, draft: true, id: docId, locale: "en" });

    it("is refused when the admin changed the field after the page showed it, and the change of the admin stays", async () => {
      const docId = await publish({ label: "Shown" });
      await changeInTheAdmin(docId, { label: "Admin" });

      const answer = await post(
        { ...page(docId), base: "Shown", key: "label", value: "Page" },
        editor
      );

      expect(answer).toMatchObject({ reason: "changed", saved: false, status: 412 });
      expect((await read(docId, true)).label).toBe("Admin");
    });

    it("is saved when the draft holds the text it began from", async () => {
      const docId = await publish({ label: "Shown" });

      const answer = await edit({ ...page(docId), base: "Shown", key: "label", value: "Page" });

      expect(answer).toEqual({ saved: true, status: 200 });
      expect((await read(docId, true)).label).toBe("Page");
    });

    it("compares the text without the marker the page read it with", async () => {
      const docId = await publish({ label: "Shown" });

      const answer = await edit({
        ...page(docId),
        base: withMarker("Shown", { path: "label" }),
        key: "label",
        value: "Page",
      });

      expect(answer).toEqual({ saved: true, status: 200 });
    });

    it("answers the text the field holds after the save, for the next save to begin from", async () => {
      const docId = await publish({ trimmed: "Shown" });

      const first = await post(
        { ...page(docId), base: "Shown", key: "trimmed", value: " New " },
        editor
      );
      const second = await post(
        { ...page(docId), base: first.value, key: "trimmed", value: "Newer" },
        editor
      );

      expect(first).toMatchObject({ saved: true, value: "New" });
      expect(second).toMatchObject({ saved: true, value: "Newer" });
    });

    it.each([
      ["the earlier one lands first", ["earlier", "later"]],
      ["the later one lands first", ["later", "earlier"]],
    ] as const)(
      "saves the later of two saves of one edit sent together when %s",
      async (_name, order) => {
        const docId = await publish({ label: "Shown" });
        const saves = {
          earlier: { ...page(docId), base: "Shown", key: "label", value: "First" },
          later: {
            ...page(docId),
            base: "Shown",
            key: "label",
            sentBefore: "First",
            value: "Second",
          },
        };

        for (const save of order) await post(saves[save], editor);

        expect((await read(docId, true)).label).toBe("Second");
      }
    );

    it("is refused when the row it edits was changed in the admin, and the other rows stay", async () => {
      const docId = await publish({ list: [{ label: "First" }, { label: "Second" }] });
      const [first, second] = (await read(docId, true)).list as Row[];
      await changeInTheAdmin(docId, {
        list: [
          { id: first!.id, label: "First" },
          { id: second!.id, label: "Admin" },
        ],
      });

      const answer = await post(
        { ...page(docId), base: "Second", key: `list.${second!.id}.label`, value: "Page" },
        editor
      );

      expect(answer).toMatchObject({ reason: "changed", saved: false, status: 412 });
      const rows = (await read(docId, true)).list as Row[];
      expect(rows.map(({ label }) => label)).toEqual(["First", "Admin"]);
    });
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

    describe("and says why", () => {
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

        const reason = await reasonOf({ ...page(docId), key: "label", value: "Changed" });
        await payload.delete({ collection: "payload-locked-documents", id: lock.id });

        expect(reason).toBe("locked");
      });

      it("for a request without a user", async () => {
        const reason = await reasonOf(
          { ...page(docId), key: "label", value: "Changed" },
          new Headers()
        );

        expect(reason).toBe("signed-out");
      });

      it("for a field the page cannot edit", async () => {
        expect(await reasonOf({ ...page(docId), key: "secret", value: "Changed" })).toBe(
          "not-editable"
        );
      });

      it("for a collection without drafts", async () => {
        const author = await payload.create({ collection: "authors", data: { name: "Ada" } });
        const edited = {
          collectionSlug: "authors",
          docId: String(author.id),
          key: "name",
          kind: "collection",
          value: "Changed",
        };

        expect(await reasonOf(edited)).toBe("no-drafts");
      });

      it("for a request it cannot read", async () => {
        expect(await reasonOf({ ...page(docId), key: "label" })).toBe("unreadable");
      });

      it("and names no reason when the text the field holds is saved", async () => {
        expect(await reasonOf({ ...page(docId), key: "label", value: "Kept" })).toBeUndefined();
      });
    });

    it.each([["text/plain"], ["application/x-www-form-urlencoded"], ["multipart/form-data"]])(
      "for a body sent as %s, which another site can send without asking",
      async (contentType) => {
        const answer = await post(
          { ...page(docId), key: "label", value: "Changed" },
          editor,
          contentType
        );
        const draft = await read(docId, true);

        expect(answer).toEqual({ reason: "unreadable", saved: false, status: 400 });
        expect(draft.label).toBe("Kept");
      }
    );

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

    it("for a user who may read the document and not update it, text and rich text alike", async () => {
      const draft = await read(docId, true);
      const published = await read(docId, false);

      const text = await post({ ...page(docId), key: "label", value: "Changed" }, reader);
      const richTextEdit = await post(
        { ...page(docId), key: "body", state: richText("Changed") },
        reader
      );

      expect(text).toEqual({ reason: "not-editable", saved: false, status: 403 });
      expect(richTextEdit).toEqual({ reason: "not-editable", saved: false, status: 403 });
      expect(await read(docId, true)).toEqual(draft);
      expect(await read(docId, false)).toEqual(published);
    });

    it("for a field the user may read and not update", async () => {
      const sealedId = await publish({ sealed: "Sealed" });

      const answer = await edit({ ...page(sealedId), key: "sealed", value: "Changed" });

      expect(answer).toEqual({ saved: false, status: 422 });
      expect((await read(sealedId, true)).sealed).toBe("Sealed");
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
